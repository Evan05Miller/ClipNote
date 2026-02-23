"use strict";
class VideoTranscriptAnalyzer {
    constructor() {
        this.currentFileId = null;
        this.currentVideoUrl = null;
        this.transcriptData = null;
        this.keywordSegments = { explicit: [], related: [] };
        this.videoPlayer = null;
        this.keywordHistory = {};
        this.currentKeyword = null;
        // Loading / simulated progress state
        this.loadingProgress = 0;
        this.loadingInterval = null;
        this.loadingStartTime = 0;
        this.loadingEstimatedMs = 0;
        this.initializeEventListeners();
        this.setupDragAndDrop();
        this.initializeNotes();
        this.initializeKeywordHistorySidebar();
    }
    initializeEventListeners() {
        const videoFileInput = document.getElementById('videoFile');
        const searchBtn = document.getElementById('searchBtn');
        const keywordInput = document.getElementById('keywordInput');
        if (videoFileInput) {
            videoFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }
        if (keywordInput) {
            keywordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
    }
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea)
            return;
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
        uploadArea.addEventListener('click', () => {
            const fileInput = document.getElementById('videoFile');
            if (fileInput) {
                fileInput.click();
            }
        });
    }
    initializeNotes() {
        const notesEditor = document.getElementById('notesEditor');
        const notesClose = document.getElementById('notesClose');
        const notesTab = document.getElementById('notesTab');
        const notesTabHeader = document.querySelector('.notes-tab-header');
        
        // Load saved notes from localStorage
        if (notesEditor) {
            const savedNotes = localStorage.getItem('clipnote-notes');
            if (savedNotes) {
                notesEditor.value = savedNotes;
            }
            
            // Save notes on input
            notesEditor.addEventListener('input', () => {
                localStorage.setItem('clipnote-notes', notesEditor.value);
            });
        }
        
        // Toggle tab on header click
        if (notesTabHeader) {
            notesTabHeader.addEventListener('click', () => {
                notesTab.classList.toggle('open');
                notesTabHeader.classList.toggle('locked');
            });
        }
        
        // Close button functionality
        if (notesClose) {
            notesClose.addEventListener('click', (e) => {
                e.stopPropagation();
                notesTab.classList.remove('open');
                notesTabHeader.classList.remove('locked');
            });
        }
        
        // Handle responsive width for mobile
        const handleResize = () => {
            const notesTab = document.getElementById('notesTab');
            if (window.innerWidth <= 768) {
                if (!notesTab.classList.contains('open')) {
                    notesTab.style.right = '-50px';
                }
            } else {
                if (!notesTab.classList.contains('open')) {
                    notesTab.style.right = '-50px';
                }
            }
        };
        
        window.addEventListener('resize', handleResize);
    }
    initializeKeywordHistorySidebar() {
        const sidebar = document.getElementById('keywordHistorySidebar');
        const sidebarHeader = document.querySelector('.sidebar-header');
        
        // Toggle sidebar on header click
        if (sidebarHeader && sidebar) {
            sidebarHeader.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                sidebarHeader.classList.toggle('locked');
            });
        }
        
        // Handle responsive width for mobile
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                if (!sidebar.classList.contains('open')) {
                    sidebar.style.left = '-50px';
                }
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
    }
    handleFileSelect(event) {
        const target = event.target;
        const file = target.files?.[0];
        if (file) {
            this.handleFileUpload(file);
        }
    }
    async handleFileUpload(file) {
        if (!this.isValidVideoFile(file)) {
            this.showError('Please select a valid video file (MP4, AVI, MOV, MKV, WMV)');
            return;
        }
        // Start overlay with an estimated progress based on file size
        this.showLoadingOverlay(file.size);
        try {
            const formData = new FormData();
            formData.append('video', file);
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }
            this.currentFileId = result.file_id;
            this.currentVideoUrl = `/video/${result.video_filename}`;
            this.transcriptData = result.transcript_data;
            // Add to keyword history
            this.keywordHistory[this.currentFileId] = { 
                name: file.name, 
                keywords: [], 
                video_filename: result.video_filename,
                transcriptData: result.transcript_data,
                suggestedKeywords: result.llm_result ? result.llm_result.keywords || [] : []
            };
            this.updateKeywordHistorySidebar();
            await this.displayVideo(result);
            this.clearResults();
            this.hideLoadingOverlay();
        }
        catch (error) {
            this.hideLoadingOverlay();
            this.showError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    isValidVideoFile(file) {
        const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/wmv'];
        return validTypes.includes(file.type);
    }
    async displayVideo(result) {
        const videoSection = document.getElementById('videoSection');
        const searchSection = document.getElementById('searchSection');
        const videoPlayer = document.getElementById('videoPlayer');
        const videoSource = document.getElementById('videoSource');
        const videoInfo = document.getElementById('videoInfo');
        if (videoSource && this.currentVideoUrl) {
            videoSource.src = this.currentVideoUrl;
        }
        if (videoPlayer) {
            videoPlayer.load();
        }
        if (videoInfo && result.transcript_data) {
            videoInfo.innerHTML = `
                <p><strong>Status:</strong> Video processed successfully</p>
                <p><strong>Transcript segments:</strong> ${result.transcript_data.length}</p>
                <p><strong>Processing completed:</strong> ${new Date().toLocaleString()}</p>
            `;
        }
        if (videoSection) {
            videoSection.style.display = 'block';
        }
        if (searchSection) {
            searchSection.style.display = 'block';
            // Display keywords after search section is visible
            console.log('displayVideo - result.llm_result:', result.llm_result);
            if (result.llm_result) {
                console.log('displayVideo - keywords:', result.llm_result.keywords);
                console.log('displayVideo - summary:', result.llm_result.summary ? 'exists' : 'missing');
                setTimeout(() => {
                    const suggestedKeywordsDiv = document.getElementById('suggestedKeywords');
                    console.log('suggestedKeywordsDiv element:', suggestedKeywordsDiv);
                    if (result.llm_result.keywords && Array.isArray(result.llm_result.keywords) && result.llm_result.keywords.length > 0) {
                        console.log('Calling displaySuggestedKeywordsFromArray with:', result.llm_result.keywords);
                        this.displaySuggestedKeywordsFromArray(result.llm_result.keywords);
                    } else if (result.llm_result.summary) {
                        console.log('Calling displaySuggestedKeywords with summary');
                        this.displaySuggestedKeywords(result.llm_result.summary);
                    } else {
                        console.log('No keywords or summary found in llm_result');
                    }
                }, 100);
            } else {
                console.log('No llm_result in result object');
            }
        }
        this.videoPlayer = videoPlayer;
    }
    displaySuggestedKeywordsFromArray(keywords) {
        console.log('displaySuggestedKeywordsFromArray called with:', keywords);
        const suggestedKeywordsDiv = document.getElementById('suggestedKeywords');
        console.log('suggestedKeywordsDiv element:', suggestedKeywordsDiv);
        
        if (!suggestedKeywordsDiv) {
            console.error('suggestedKeywordsDiv element not found in DOM');
            return;
        }
        
        if (!keywords) {
            console.log('Keywords is null/undefined');
            return;
        }
        
        if (!Array.isArray(keywords)) {
            console.log('Keywords is not an array:', typeof keywords, keywords);
            return;
        }
        
        if (keywords.length === 0) {
            console.log('Keywords array is empty');
            return;
        }
        
        // Display keywords from array (limit to 8)
        const displayKeywords = keywords.slice(0, 8);
        console.log('Displaying keywords:', displayKeywords);
        
        const html = displayKeywords.map(keyword => {
            if (!keyword || typeof keyword !== 'string') {
                console.warn('Invalid keyword:', keyword);
                return '';
            }
            const escapedKeyword = keyword.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\\/g, '\\\\');
            return `<span class="keyword-chip" onclick="app.selectKeyword('${escapedKeyword}')">${keyword}</span>`;
        }).filter(html => html.length > 0).join('');
        
        console.log('Keywords HTML to set:', html);
        suggestedKeywordsDiv.innerHTML = html;
        console.log('Keywords HTML set successfully. Element innerHTML:', suggestedKeywordsDiv.innerHTML);
    }
    displaySuggestedKeywords(summary) {
        const suggestedKeywordsDiv = document.getElementById('suggestedKeywords');
        if (!suggestedKeywordsDiv)
            return;
        if (!summary) return;
        // Extract keywords from the summary (fallback method)
        const keywordsMatch = summary.match(/KeyWords?:?\s*(.+)/i);
        if (keywordsMatch) {
            const keywords = keywordsMatch[1]
                .split(/[,;]/)
                .map(k => k.trim())
                .filter(k => k.length > 0)
                .slice(0, 8);
            suggestedKeywordsDiv.innerHTML = keywords.map(keyword => {
                const escapedKeyword = keyword.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                return `<span class="keyword-chip" onclick="app.selectKeyword('${escapedKeyword}')">${keyword}</span>`;
            }).join('');
        }
    }
    selectKeyword(keyword) {
        // remember selected keyword for highlighting in history
        this.currentKeyword = keyword;
        const keywordInput = document.getElementById('keywordInput');
        if (keywordInput) {
            keywordInput.value = keyword;
        }
        this.performSearch();
    }
    async performSearch() {
        const keywordInput = document.getElementById('keywordInput');
        const keyword = keywordInput?.value.trim();
        if (!keyword) {
            this.showError('Please enter a keyword to search');
            return;
        }
        // remember the currently searched keyword for UI highlighting
        this.currentKeyword = keyword;
        if (!this.currentFileId) {
            this.showError('Please upload a video first');
            return;
        }
        this.showLoadingOverlay();
        try {
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_id: this.currentFileId,
                    keyword: keyword
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Search failed');
            }
            // Handle new format with explicit and related segments
            if (result.keyword_segments && typeof result.keyword_segments === 'object' && 'explicit' in result.keyword_segments) {
                this.keywordSegments = {
                    explicit: result.keyword_segments.explicit || [],
                    related: result.keyword_segments.related || []
                };
            } else {
                // Fallback for old format
                this.keywordSegments = {
                    explicit: result.keyword_segments || [],
                    related: []
                };
            }
            this.displaySearchResults(result);
            this.displayTimeline(this.keywordSegments);
            // Add keyword to history with results
            const existing = this.keywordHistory[this.currentFileId].keywords.find(k => k.keyword === keyword);
            if (!existing) {
                this.keywordHistory[this.currentFileId].keywords.push({ keyword, results: result });
                this.updateKeywordHistorySidebar();
            }
            this.hideLoadingOverlay();
        }
        catch (error) {
            this.hideLoadingOverlay();
            this.showError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    displaySearchResults(result) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsSummary = document.getElementById('resultsSummary');
        const transcriptContent = document.getElementById('transcriptContent');
        const aiAnalysis = document.getElementById('aiAnalysis');
        // Display summary
        if (resultsSummary) {
            resultsSummary.innerHTML = `
                <p><strong>Found ${(this.keywordSegments.explicit?.length || 0) + (this.keywordSegments.related?.length || 0)} segments</strong> related to the keyword</p>
                <p>${this.keywordSegments.explicit?.length || 0} explicit mentions, ${this.keywordSegments.related?.length || 0} closely related</p>
                <p>Total transcript segments: ${result.total_segments}</p>
            `;
        }
        // Display transcript with highlights
        if (transcriptContent) {
            transcriptContent.innerHTML = '';
            if (this.transcriptData) {
                // Create sets of segment identifiers for faster lookup
                const explicitSegments = new Set();
                const relatedSegments = new Set();
                
                // Add explicit segments to set using start time as identifier
                if (this.keywordSegments.explicit && Array.isArray(this.keywordSegments.explicit)) {
                    this.keywordSegments.explicit.forEach(ks => {
                        const key = Math.round(ks.start * 10) / 10;
                        explicitSegments.add(key);
                    });
                }
                
                // Add related segments to set using start time as identifier
                if (this.keywordSegments.related && Array.isArray(this.keywordSegments.related)) {
                    this.keywordSegments.related.forEach(ks => {
                        const key = Math.round(ks.start * 10) / 10;
                        relatedSegments.add(key);
                    });
                }
                
                this.transcriptData.forEach(segment => {
                    // Check if segment is explicit, related, or normal
                    const segmentKey = Math.round(segment.start * 10) / 10;
                    const isExplicit = explicitSegments.has(segmentKey);
                    const isRelated = !isExplicit && relatedSegments.has(segmentKey);
                    
                    let segmentClass = 'normal';
                    if (isExplicit) {
                        segmentClass = 'keyword-explicit';
                    } else if (isRelated) {
                        segmentClass = 'keyword-related';
                    }
                    
                    const segmentDiv = document.createElement('div');
                    segmentDiv.className = `transcript-segment ${segmentClass}`;
                    segmentDiv.innerHTML = `
                        <div class="transcript-timestamp">${segment.timestamp}</div>
                        <div class="transcript-text">${segment.text}</div>
                    `;
                    // Add click event to jump to video timestamp
                    segmentDiv.addEventListener('click', () => {
                        if (this.videoPlayer) {
                            this.videoPlayer.currentTime = segment.start;
                            this.videoPlayer.play();
                        }
                    });
                    transcriptContent.appendChild(segmentDiv);
                });
            }
        }
        // Display AI analysis
        if (aiAnalysis && result.llm_result.keyword_script) {
            const keywordInput = document.getElementById('keywordInput');
            aiAnalysis.innerHTML = `
                <h4> AI Analysis for "${keywordInput?.value || 'keyword'}"</h4>
                <div contenteditable="true" class="editable-analysis" style="white-space: pre-line; line-height: 1.6; border: 1px solid #4a5f8a; padding: 10px; border-radius: 5px; background: #1a2f5a; color: #ffffff; min-height: 100px;">${result.llm_result.keyword_script}</div>
            `;
        }
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
    }
    displayTimeline(keywordSegments) {
        const timelineSection = document.getElementById('timelineSection');
        const timeline = document.getElementById('timeline');
        if (!this.videoPlayer || !this.transcriptData || !timeline)
            return;
        // Wait for video metadata to load
        const createTimeline = () => {
            const videoDuration = this.videoPlayer.duration || 0;
            if (videoDuration === 0) {
                // If duration still not available, try again after a short delay
                setTimeout(createTimeline, 100);
                return;
            }
            // Clear existing timeline
            timeline.innerHTML = '';
            
            // Create sets of segment identifiers for faster lookup
            const explicitSegments = new Set();
            const relatedSegments = new Set();
            
            // Add explicit segments to set using start time as identifier
            if (keywordSegments.explicit && Array.isArray(keywordSegments.explicit)) {
                keywordSegments.explicit.forEach(ks => {
                    const key = Math.round(ks.start * 10) / 10;
                    explicitSegments.add(key);
                });
            }
            
            // Add related segments to set using start time as identifier
            if (keywordSegments.related && Array.isArray(keywordSegments.related)) {
                keywordSegments.related.forEach(ks => {
                    const key = Math.round(ks.start * 10) / 10;
                    relatedSegments.add(key);
                });
            }
            
            // Create timeline segments
            this.transcriptData.forEach((segment, index) => {
                // Check if segment is explicit, related, or normal
                const segmentKey = Math.round(segment.start * 10) / 10;
                const isExplicit = explicitSegments.has(segmentKey);
                const isRelated = !isExplicit && relatedSegments.has(segmentKey);
                
                let segmentClass = 'normal';
                if (isExplicit) {
                    segmentClass = 'keyword-explicit';
                } else if (isRelated) {
                    segmentClass = 'keyword-related';
                }
                
                const segmentDiv = document.createElement('div');
                segmentDiv.className = `timeline-segment ${segmentClass}`;
                const leftPercent = (segment.start / videoDuration) * 100;
                const widthPercent = ((segment.end - segment.start) / videoDuration) * 100;
                // Add small overlap to prevent gaps (0.1% overlap)
                const overlap = index > 0 ? 0.1 : 0;
                segmentDiv.style.left = `${leftPercent - overlap}%`;
                segmentDiv.style.width = `${widthPercent + overlap}%`;
                segmentDiv.title = `${segment.timestamp} ${segment.text.substring(0, 50)}...`;
                segmentDiv.addEventListener('click', () => {
                    if (this.videoPlayer) {
                        this.videoPlayer.currentTime = segment.start;
                        this.videoPlayer.play();
                    }
                });
                timeline.appendChild(segmentDiv);
            });
            if (timelineSection) {
                timelineSection.style.display = 'block';
            }
        };
        // Start creating timeline
        if (this.videoPlayer.readyState >= 1) {
            // Metadata already loaded
            createTimeline();
        }
        else {
            // Wait for metadata to load
            this.videoPlayer.addEventListener('loadedmetadata', createTimeline, { once: true });
        }
    }
    showLoadingOverlay(fileSize) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const processingProgress = document.getElementById('processingProgress');
        const processingFill = document.getElementById('processingFill');
        const processingPercent = document.getElementById('processingPercent');
        const processingLabel = document.getElementById('processingLabel');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
        // If we have a file size, show simulated percent progress
        if (fileSize && processingProgress && processingFill && processingPercent && processingLabel) {
            processingProgress.style.display = 'block';
            processingFill.style.width = '0%';
            processingPercent.textContent = '0%';
            processingLabel.textContent = 'Estimating time...';
            this.startLoadingProgress(fileSize);
        }
        else if (processingProgress) {
            processingProgress.style.display = 'none';
        }
    }

    hideLoadingOverlay() {
        const processingFill = document.getElementById('processingFill');
        const processingPercent = document.getElementById('processingPercent');
        const processingLabel = document.getElementById('processingLabel');
        const loadingOverlay = document.getElementById('loadingOverlay');
        // finalize progress
        this.stopLoadingProgress(true);
        if (processingFill) {
            processingFill.style.width = '100%';
        }
        if (processingPercent) {
            processingPercent.textContent = '100%';
        }
        if (processingLabel) {
            processingLabel.textContent = 'Finished';
        }
        // hide overlay after short delay so user sees 100%
        setTimeout(() => {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            const processingProgress = document.getElementById('processingProgress');
            if (processingProgress) processingProgress.style.display = 'none';
        }, 450);
    }

    startLoadingProgress(fileSize) {
        // Estimate processing time based on file size (bytes).
        // Use an approximate throughput (bytes/sec) and clamp to reasonable bounds.
        // Calibrate throughput using user's metric: 13.5 MB takes 180s (3 minutes)
        // Use that as the default bytes/sec unless overridden.
        const sampleMb = 13.5;
        const sampleSeconds = 180;
        const defaultBytesPerSecond = Math.round((sampleMb * 1024 * 1024) / sampleSeconds);
        // Allow reasonable bounds in case of very small/large files
        const minBytesPerSecond = 50 * 1024; // 50 KB/s
        const maxBytesPerSecond = 2 * 1024 * 1024; // 2 MB/s
        const bytesPerSecond = Math.max(minBytesPerSecond, Math.min(maxBytesPerSecond, defaultBytesPerSecond));
        let estimatedMs = Math.round((fileSize / bytesPerSecond) * 1000);
        // Clamp between 5s and 600s (10 minutes max)
        estimatedMs = Math.max(5000, Math.min(600000, estimatedMs));
        this.loadingEstimatedMs = estimatedMs;
        this.loadingStartTime = Date.now();
        this.loadingProgress = 0;
        // clear any existing interval
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
        const processingFill = document.getElementById('processingFill');
        const processingPercent = document.getElementById('processingPercent');
        const processingLabel = document.getElementById('processingLabel');
        this.loadingInterval = setInterval(() => {
            const elapsed = Date.now() - this.loadingStartTime;
            const frac = Math.min(1, elapsed / this.loadingEstimatedMs);
            // target up to 98% before completion
            const targetPercent = Math.floor(frac * 98);
            // smooth the progress: move a fraction of the gap each tick (avoid big jumps)
            if (targetPercent > this.loadingProgress) {
                const step = Math.max(1, Math.ceil((targetPercent - this.loadingProgress) * 0.25));
                this.loadingProgress = Math.min(98, this.loadingProgress + step);
            }
            if (processingFill) processingFill.style.width = `${this.loadingProgress}%`;
            if (processingPercent) processingPercent.textContent = `${this.loadingProgress}%`;
            if (processingLabel) {
                if (elapsed < this.loadingEstimatedMs) {
                    processingLabel.textContent = `Processing... (${Math.ceil((this.loadingEstimatedMs - elapsed) / 1000)}s left)`;
                }
                else {
                    processingLabel.textContent = 'Finalizing...';
                }
            }
            // If we've reached near the estimated time, cap at 98 until stopped
            if (frac >= 1) {
                this.loadingProgress = Math.min(98, this.loadingProgress);
            }
        }, 300);
    }

    stopLoadingProgress(setComplete = false) {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
        if (setComplete) {
            this.loadingProgress = 100;
            const processingFill = document.getElementById('processingFill');
            const processingPercent = document.getElementById('processingPercent');
            const processingLabel = document.getElementById('processingLabel');
            if (processingFill) processingFill.style.width = '100%';
            if (processingPercent) processingPercent.textContent = '100%';
            if (processingLabel) processingLabel.textContent = 'Finalizing...';
        }
    }
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorModal = document.getElementById('errorModal');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        if (errorModal) {
            errorModal.style.display = 'flex';
        }
    }
    closeErrorModal() {
        const errorModal = document.getElementById('errorModal');
        if (errorModal) {
            errorModal.style.display = 'none';
        }
    }
    updateKeywordHistorySidebar() {
        const sidebarContent = document.getElementById('sidebarContent');
        if (!sidebarContent) return;
        sidebarContent.innerHTML = '';
        const videos = Object.entries(this.keywordHistory);
        if (videos.length === 0) {
            sidebarContent.innerHTML = '<p style="color: #e0e0e0; padding: 10px;">No videos uploaded yet. Upload a video to start building your keyword history.</p>';
            return;
        }
        for (const [fileId, videoData] of videos) {
            const section = document.createElement('div');
            section.className = 'video-history-section';
            section.innerHTML = `<h5>${videoData.name}</h5>`;
            videoData.keywords.forEach(item => {
                const keywordDiv = document.createElement('div');
                keywordDiv.className = 'keyword-item';
                // Only highlight the specific keyword for the currently selected video
                if (fileId === this.currentFileId && this.currentKeyword && item.keyword === this.currentKeyword) {
                    keywordDiv.classList.add('active');
                }
                keywordDiv.textContent = item.keyword;
                keywordDiv.addEventListener('click', async () => {
                    // If switching videos, await the switch so UI updates correctly
                    if (fileId !== this.currentFileId) {
                        await this.switchToVideo(fileId);
                    }
                    // Set the current keyword to the clicked item and refresh highlight
                    this.currentKeyword = item.keyword;
                    // Load results if cached, else search
                    if (item.results) {
                        this.displayCachedResults(item.results, item.keyword);
                    }
                    else {
                        const keywordInput = document.getElementById('keywordInput');
                        if (keywordInput) {
                            keywordInput.value = item.keyword;
                            this.performSearch();
                        }
                    }
                    // Update sidebar so only this keyword is highlighted
                    this.updateKeywordHistorySidebar();
                });
                section.appendChild(keywordDiv);
            });
            sidebarContent.appendChild(section);
        }
    }
    async switchToVideo(fileId) {
        const videoData = this.keywordHistory[fileId];
        if (!videoData) return;
        // when switching videos clear the current keyword selection
        this.currentKeyword = null;
        this.currentFileId = fileId;
        this.currentVideoUrl = `/video/${videoData.video_filename}`;
        this.transcriptData = videoData.transcriptData;
        // Update video display
        const videoSection = document.getElementById('videoSection');
        const searchSection = document.getElementById('searchSection');
        const videoSource = document.getElementById('videoSource');
        const videoPlayer = document.getElementById('videoPlayer');
        if (videoSource) {
            videoSource.src = this.currentVideoUrl;
        }
        if (videoPlayer) {
            videoPlayer.load();
        }
        if (videoSection) {
            videoSection.style.display = 'block';
        }
        if (searchSection) {
            searchSection.style.display = 'block';
        }
        // Update video info
        const videoInfo = document.getElementById('videoInfo');
        if (videoInfo && this.transcriptData) {
            videoInfo.innerHTML = `
                <p><strong>Status:</strong> Video loaded from history</p>
                <p><strong>Transcript segments:</strong> ${this.transcriptData.length}</p>
                <p><strong>Loaded:</strong> ${new Date().toLocaleString()}</p>
            `;
        }
        // Clear previous results
        this.clearResults();
        this.updateKeywordHistorySidebar();
        // Display suggested keywords for this video
        if (videoData.suggestedKeywords && videoData.suggestedKeywords.length > 0) {
            this.displaySuggestedKeywordsFromArray(videoData.suggestedKeywords);
        }
    }
    displayCachedResults(result, keyword) {
        // Handle new format with explicit and related segments
        if (result.keyword_segments && typeof result.keyword_segments === 'object' && 'explicit' in result.keyword_segments) {
            this.keywordSegments = {
                explicit: result.keyword_segments.explicit || [],
                related: result.keyword_segments.related || []
            };
        } else {
            // Fallback for old format
            this.keywordSegments = {
                explicit: result.keyword_segments || [],
                related: []
            };
        }
        this.displaySearchResults(result);
        this.displayTimeline(this.keywordSegments);
        // Set the keyword in input
        const keywordInput = document.getElementById('keywordInput');
        if (keywordInput) {
            keywordInput.value = keyword;
            // remember the currently selected keyword
            this.currentKeyword = keyword;
        }
    }
    clearResults() {
        const resultsSection = document.getElementById('resultsSection');
        const timelineSection = document.getElementById('timelineSection');
        const keywordInput = document.getElementById('keywordInput');
        const suggestedKeywordsDiv = document.getElementById('suggestedKeywords');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        if (timelineSection) {
            timelineSection.style.display = 'none';
        }
        if (keywordInput) {
            keywordInput.value = '';
        }
        if (suggestedKeywordsDiv) {
            suggestedKeywordsDiv.innerHTML = '';
        }
        this.keywordSegments = { explicit: [], related: [] };
    }
}
// Global function for keyword selection
window.selectKeyword = function (keyword) {
    app.selectKeyword(keyword);
};
// Global function for error modal
window.closeErrorModal = function () {
    app.closeErrorModal();
};
// Initialize the application
const app = new VideoTranscriptAnalyzer();
