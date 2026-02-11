from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import os
import whisper
import re
from werkzeug.utils import secure_filename
import uuid
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# ------------------ Configuration ------------------

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB

SECRET_KEY = os.getenv('SECRET_KEY')
OPENAI_BASE_URL = os.getenv(
    "AI_INTEGRATIONS_OPENAI_BASE_URL",
    SECRET_KEY
)
OPENAI_API_KEY = os.getenv("AI_INTEGRATIONS_OPENAI_API_KEY", "")

# ------------------ LLM Service ------------------

class LLMService:
    def __init__(self):
        self.client = OpenAI(
            base_url=OPENAI_BASE_URL,
            api_key=OPENAI_API_KEY,
            timeout=60
        )
        self.model_name = "qwen/qwen3-vl-30b"

    def generate_content(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": "You are a helpful academic assistant that analyzes transcripts."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        return response.choices[0].message.content


service = LLMService()

# ------------------ Helpers ------------------

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {
        'mp4', 'avi', 'mov', 'mkv', 'wmv'
    }

def transcribe_with_timestamps(input_file, output_file, model_size="small"):
    whisper_model = whisper.load_model(model_size)
    result = whisper_model.transcribe(input_file, language="en")

    transcript_data = []
    with open(output_file, "w", encoding="utf-8") as f:
        for seg in result["segments"]:
            start = seg["start"]
            end = seg["end"]
            text = seg["text"].strip()
            timestamp = f"[{start:.2f} --> {end:.2f}]"
            f.write(f"{timestamp} {text}\n")
            transcript_data.append({
                "start": start,
                "end": end,
                "text": text,
                "timestamp": timestamp
            })

    return transcript_data

# ------------------ AI Keyword Matching ------------------

def find_keyword_segments_ai(transcript_data, keyword, transcript_text):
    try:
        keyword_lower = keyword.lower()
        explicit_segments = []
        explicit_indices = []

        for idx, segment in enumerate(transcript_data):
            if keyword_lower in segment["text"].lower():
                explicit_segments.append(segment)
                explicit_indices.append(idx)

        segments_text = ""
        for idx, segment in enumerate(transcript_data):
            segments_text += f"[{idx}] {segment['timestamp']}: {segment['text']}\n"

        segment_analysis = service.generate_content(f"""
Keyword: "{keyword}"

Transcript segments:
{segments_text}

Explicit mentions already found: {explicit_indices if explicit_indices else "none"}

Return ONLY a comma-separated list of segment numbers related to "{keyword}"
but that do NOT explicitly mention it. If none, return "none".
""")

        segment_indices_text = segment_analysis.strip().lower()

        related_segments = []
        if segment_indices_text != "none":
            indices = re.findall(r'\d+', segment_indices_text)
            for idx_str in indices:
                idx = int(idx_str)
                if idx not in explicit_indices and 0 <= idx < len(transcript_data):
                    related_segments.append(transcript_data[idx])

        return {
            "explicit": explicit_segments,
            "related": related_segments
        }

    except Exception as e:
        print(f"Error in AI segment matching: {e}")
        explicit = [seg for seg in transcript_data if keyword_lower in seg["text"].lower()]
        return {"explicit": explicit, "related": []}

# ------------------ Transcript Processing ------------------

def process_transcript_with_llm(transcript_text, keyword=None):
    try:
        shortened_text = service.generate_content(f"""
Transcript:
{transcript_text}

Select the most important sentences and keep timestamps.
""").strip()

        summary_text = service.generate_content(f"""
Transcript:
{transcript_text}

Write bullet-point summary.
At the end add:
KeyWords: word1, word2, phrase1
""").strip()

        keywords = []
        match = re.search(r'KeyWords?:\s*(.+)', summary_text, re.IGNORECASE)
        if match:
            raw = [k.strip() for k in re.split(r'[,;]', match.group(1))]
            keywords = [k for k in raw if 1 <= len(k.split()) <= 3][:15]

        result = {
            "shortened_text": shortened_text,
            "summary": summary_text,
            "keywords": keywords
        }

        if keyword:
            keyword_script = service.generate_content(f"""
Create a study guide for "{keyword}" using this transcript:

{transcript_text}

Use headings and bullet points.
""").strip()
            result["keyword_script"] = keyword_script

        return result

    except Exception as e:
        print(f"Error processing with LLM: {e}")
        return {"error": str(e)}

# ------------------ Routes ------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video provided'}), 400

    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        file_id = str(uuid.uuid4())
        ext = file.filename.rsplit('.', 1)[1].lower()
        video_filename = f"{file_id}.{ext}"
        video_path = os.path.join(UPLOAD_FOLDER, video_filename)
        file.save(video_path)

        transcript_path = os.path.join(PROCESSED_FOLDER, f"{file_id}_transcript.txt")
        transcript_data = transcribe_with_timestamps(video_path, transcript_path)

        transcript_text = "\n".join(
            f"{seg['timestamp']} {seg['text']}" for seg in transcript_data
        )

        llm_result = process_transcript_with_llm(transcript_text)

        return jsonify({
            "file_id": file_id,
            "video_filename": video_filename,
            "transcript_data": transcript_data,
            "llm_result": llm_result
        })

    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/search', methods=['POST'])
def search_keyword():
    data = request.get_json()
    file_id = data.get("file_id")
    keyword = data.get("keyword")

    transcript_path = os.path.join(PROCESSED_FOLDER, f"{file_id}_transcript.txt")
    if not os.path.exists(transcript_path):
        return jsonify({'error': 'Transcript not found'}), 404

    with open(transcript_path, 'r', encoding='utf-8') as f:
        transcript_text = f.read()

    transcript_data = []
    for line in transcript_text.splitlines():
        match = re.match(r'\[(.+?) --> (.+?)\] (.+)', line)
        if match:
            transcript_data.append({
                "start": float(match.group(1)),
                "end": float(match.group(2)),
                "text": match.group(3),
                "timestamp": f"[{match.group(1)} --> {match.group(2)}]"
            })

    keyword_segments = find_keyword_segments_ai(
        transcript_data, keyword, transcript_text
    )

    llm_result = process_transcript_with_llm(transcript_text, keyword)

    return jsonify({
        "keyword_segments": keyword_segments,
        "llm_result": llm_result
    })

@app.route('/video/<filename>')
def serve_video(filename):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(path):
        return send_file(path)
    return jsonify({'error': 'Video not found'}), 404

# ------------------ Run ------------------

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
