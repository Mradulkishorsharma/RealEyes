from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mp3', 'wav'}

# Bana do uploads folder agar nahi hai
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze/video', methods=['POST'])
@app.route('/analyze/audio', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        # filename = secure_filename(file.filename)
        # file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        # file.save(file_path)
        
        # Abhi real model nahi hai → dummy response
        dummy_response = {
            "summary": "Fake content detected with high confidence",
            "confidence_percent": 87.4,
            "frames_analyzed": 342 if "video" in request.path else "N/A",
            "model_used": "Dummy Model v0.1 (placeholder)",
            "message": "This is dummy/fallback response. Real deepfake model coming soon."
        }
        
        # Agar audio tha to thoda alag dummy data
        if "audio" in request.path:
            dummy_response.update({
                "summary": "Likely Real audio",
                "confidence_percent": 12.8,
                "frames_analyzed": "N/A",
            })
        
        return jsonify(dummy_response)
    
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
    # Ya phir production ke liye: app.run(debug=False)