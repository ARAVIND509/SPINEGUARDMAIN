from flask import Flask, request, jsonify
import spine_analysis

app = Flask(__name__)

@app.route("/analyze", methods=["POST"])
def analyze():
    file = request.files["image"]
    result = spine_analysis.analyze(file)
    return jsonify(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)