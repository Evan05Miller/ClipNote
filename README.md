# UD-ClipNote

A modern web application that processes video files, generates transcripts with timestamps, and provides intelligent keyword search with highlighted segments, allowing students to easily study with video lectures as a resource.

## Features

- Video Upload: Drag & drop or browse to upload video files
- Automatic Transcription: Uses OpenAI Whisper for accurate speech-to-text conversion
- Keyword Search: Search for specific keywords in the transcript with keywords provided or custom words
- Smart Highlighting: Visual highlighting of keyword segments in both transcript and video timeline
- AI Analysis: Uses Google Gemini AI for intelligent summarization and keyword extraction
- Interactive Timeline: Click on timeline segments to jump to specific video moments

## Installation

1. Clone or download the project files

2. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Install FFmpeg (required for video processing):

   - Windows: Download from https://ffmpeg.org/download.html and add to PATH
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

## Usage

1. Start the application:

   ```bash
   python app.py
   ```

2. Open your browser and go to `http://localhost:5000`

3. Upload a video file by dragging and dropping or clicking the upload area

4. Wait for processing

5. Search for keywords using the search box or click on suggested keywords

6. Interact with results:

   - Click on highlighted transcript segments to jump to that part of the video
   - Use the timeline to navigate through the video
   - View AI-generated analysis for your keyword searches

## Supported Video Formats

- MP4
- AVI
- MOV
- MKV
- WMV

## Technical Details

- Backend: Flask with CORS support
- Video Processing: OpenAI Whisper for transcription
- AI Analysis: Google Gemini API for summarization and keyword extraction
- Frontend: JavaScript with modern CSS
- File Storage: Local file system (uploads and processed folders)

## Configuration

The application uses your existing Google Gemini API key. Make sure you have:
- A valid Google Gemini API key
- Sufficient API quota for video processing

## Troubleshooting

- Video upload fails: Check file size (max 500MB) and format
- Transcription fails: Ensure FFmpeg is installed and accessible
- AI analysis fails:
- Slow processing: Large videos take longer to process; consider using shorter clips for testing

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is for educational and personal use. Created by Evan Miller 
in conjunction with ATS at the University of Delaware

