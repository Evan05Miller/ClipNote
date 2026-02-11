"use strict";
class VideoTranscriptAnalyzer {
    constructor() {
        this.currentFileId = null;
        this.currentVideoUrl = null;
        this.transcriptData = null;
        this.keywordSegments = { explicit: [], related: [] };
        this.videoPlayer = null;
        this.initializeEventListeners();
        this.setupDragAndDrop();
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
        this.showLoadingOverlay();
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
            await this.displayVideo(result);
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
                <div style="white-space: pre-line; line-height: 1.6;">${result.llm_result.keyword_script}</div>
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
    showLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }
    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
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
