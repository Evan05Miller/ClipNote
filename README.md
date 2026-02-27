# ClipNote

ClipNote is a lightweight Flask web application designed to help students and researchers
extract value from lecture videos, interviews, or any spoken‑word recordings.  Upload a
video, and the server will generate a timestamped transcript using OpenAI's Whisper model.
A large language model (Qwen) then analyzes the text to supply summaries, keyword
suggestions, and even simple study guides.  You can search the transcript for keywords,
leveraging AI to locate related segments that don't explicitly mention the search term.
The video and transcript interface let you jump to relevant moments, take notes, and
keep a history of your searches for later review.

---

## Key Features

- **Drag‑&‑Drop Upload** or browse for video files. Supported formats: MP4, AVI, MOV,
  MKV, WMV.
- **Server‑side Transcription:** Whisper model produces a timestamped text file stored
  under `processed/`.
- **AI‑Assisted Search:** Type a keyword (or choose a suggested one) and get both
  explicit hits and related segments identified by the LLM.
- **Suggested Keywords & Summaries:** The LLM extracts important terms and bullet‑point
  summaries when processing a file.
- **Study Guides:** Generate a brief guide focused on any selected keyword.
- **Interactive Video Player:** Click transcript entries or timeline markers to seek the
  video.
- **Local Notes Panel:** Keep personal notes in the sidebar; they persist via `localStorage`.
- **Keyword History Sidebar:** Quickly revisit past files, keywords, and suggestions.
- **Settings Panel:** Adjust font size, toggle black‑and‑white mode, and other UI options.

---

## Installation

1. Clone or unzip the repository.
2. Create a Python virtual environment (recommended):

   ```sh
   python -m venv .venv
   .\.venv\Scripts\activate      # Windows
   source .venv/bin/activate       # macOS/Linux
   ```

3. Install dependencies:

   ```sh
   pip install -r requirements.txt
   ```

4. Install **FFmpeg** and ensure it is on your `PATH`:
   - **Windows:** download a static build from https://ffmpeg.org/download.html
   - **macOS:** `brew install ffmpeg`
   - **Linux:** `sudo apt install ffmpeg` (or use your distro's package manager)

5. Create a `.env` file (optional) in the project root with the following variables:

   ```env
   SECRET_KEY=your-secret-key
   AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
   AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
   ```

   Only the API key is strictly required; the base URL defaults to the value of
   `SECRET_KEY` if you omit it.

---

## Running the App

```sh
python app.py
```

Open your browser and navigate to `http://localhost:5000`.

1. Upload a supported video file.
2. Wait for the progress overlay to finish while the server transcribes and analyzes the file.
3. Explore the generated transcript, suggested keywords, and summary.
4. Enter a keyword or click a suggested one to search; the results include explicit
   segments and AI‑related ones.
5. Use the video controls to jump to points of interest.
6. Take notes in the sidebar and adjust UI settings as needed.

Transcripts are written to `processed/` and videos are served from `uploads/`.

---

## Configuration & Environment

- **API Key** – required for the Qwen model to run.  Set it in `.env` or your shell.
- **MAX_CONTENT_LENGTH** – default 500 MB; change in `app.py` if needed.
- **Whisper Model Size** – currently hardcoded to `small` in `transcribe_with_timestamps`.

---

## Troubleshooting

- **Upload Fails:** Verify file size/format and that the server is running in the correct
  directory.
- **Transcription Errors:** Make sure FFmpeg is installed and accessible by the Python
  process.
- **LLM Timeouts/Errors:** Check your network and API quota; log messages appear in the
  console.
- **Browser Issues:** Works best in Chrome/Edge/Firefox; Safari has occasional playback
  quirks.

---

## Development Notes

- There is no database; all state is stored on disk (`uploads/`, `processed/`) or in the
  browser (`localStorage`).
- Backend code is in `app.py`; add new LLM prompts or transcript utilities there.
- Frontend live reload isn't configured – you must refresh the page after editing
  `static/` or `templates/` files.

---

## License

Copyright [2025] [Evan D. Miller]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.