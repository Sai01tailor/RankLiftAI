"""
══════════════════════════════════════════════════════════════
 JeeWallah ML Microservice — Flask API
 
 Endpoints:
   POST /predict/weak-topics  → Identify weak topics for a student
   POST /predict/score        → Predict expected JEE score
   GET  /health               → Health check
   POST /train/weak-topics    → Retrain weak topic model (admin)
   POST /train/score          → Retrain score model (admin)
══════════════════════════════════════════════════════════════
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from predictor import WeakTopicPredictor, ScorePredictor
from trainer import WeakTopicTrainer, ScoreTrainer

cors_origin_env = os.getenv("CORS_ORIGIN", "http://localhost:5173")
allowed_origins = [o.strip() for o in cors_origin_env.split(",") if o.strip()]
allowed_origins.extend([
    "http://localhost:5175", 
    "http://localhost:5174", 
    "http://localhost:5173", 
    "https://carole-unbase-mediately.ngrok-free.dev"
])
allowed_origins = list(set(allowed_origins))

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)

# ── Initialize predictors ──
MODEL_DIR = os.getenv("MODEL_DIR", "./models")
os.makedirs(MODEL_DIR, exist_ok=True)

weak_topic_predictor = WeakTopicPredictor(MODEL_DIR)
score_predictor = ScorePredictor(MODEL_DIR)


# ══════════════════════════════════════
#  HEALTH CHECK
# ══════════════════════════════════════
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "jeewallah-ml",
        "models": {
            "weak_topic": weak_topic_predictor.is_loaded(),
            "score": score_predictor.is_loaded()
        }
    }), 200


# ══════════════════════════════════════
#  PREDICT WEAK TOPICS
# ══════════════════════════════════════
@app.route("/predict/weak-topics", methods=["POST"])
def predict_weak_topics():
    try:
        data = request.get_json()
        if not data or "topicAccuracy" not in data:
            return jsonify({"error": "topicAccuracy data required"}), 400

        result = weak_topic_predictor.predict(
            topic_accuracy=data["topicAccuracy"],
            recent_attempts=data.get("recentAttempts", []),
            overall_stats=data.get("overallStats", {})
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════
#  PREDICT SCORE
# ══════════════════════════════════════
@app.route("/predict/score", methods=["POST"])
def predict_score():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request data required"}), 400

        result = score_predictor.predict(
            mock_test_history=data.get("mockTestHistory", []),
            topic_accuracy=data.get("topicAccuracy", [])
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════
#  RETRAIN MODELS (admin-triggered)
# ══════════════════════════════════════
@app.route("/train/weak-topics", methods=["POST"])
def train_weak_topics():
    try:
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/jeewallah")
        trainer = WeakTopicTrainer(mongo_uri, MODEL_DIR)
        metrics = trainer.train()
        weak_topic_predictor.reload()
        return jsonify({"message": "Weak topic model retrained", "metrics": metrics}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/train/score", methods=["POST"])
def train_score():
    try:
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/jeewallah")
        trainer = ScoreTrainer(mongo_uri, MODEL_DIR)
        metrics = trainer.train()
        score_predictor.reload()
        return jsonify({"message": "Score model retrained", "metrics": metrics}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════
#  RUN
# ══════════════════════════════════════
if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_ENV", "production") == "development"
    print(f"\n🧠 JeeWallah ML Service running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
