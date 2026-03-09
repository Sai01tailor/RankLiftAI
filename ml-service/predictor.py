"""
══════════════════════════════════════════════════════════════
 ML Predictors — Load trained models and make predictions
 
 Two models:
 1. WeakTopicPredictor — Random Forest classifier
    Predicts which topics a student is weak in based on:
    - Topic-level accuracy, attempt count, avg time
    - Recent attempt patterns (trending down = weak)
    - Difficulty distribution of attempts
    
 2. ScorePredictor — Gradient Boosting regressor
    Predicts expected JEE score based on:
    - Mock test score history
    - Subject-wise accuracy
    - Improvement trend
══════════════════════════════════════════════════════════════
"""

import os
import numpy as np
import joblib


class WeakTopicPredictor:
    """Predicts weak topics using a trained Random Forest model.
    Falls back to rule-based heuristics if no model is available."""

    def __init__(self, model_dir):
        self.model_dir = model_dir
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.reload()

    def is_loaded(self):
        return self.model is not None

    def reload(self):
        model_path = os.path.join(self.model_dir, "weak_topic_model.joblib")
        scaler_path = os.path.join(self.model_dir, "weak_topic_scaler.joblib")
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            print("✅ Weak topic model loaded")
        else:
            print("⚠️  No weak topic model found — using rule-based fallback")

    def _extract_features(self, topic):
        """Extract feature vector from a single topic accuracy record."""
        accuracy = topic.get("accuracy", 0)
        total_attempts = topic.get("totalAttempts", 0)
        correct = topic.get("correctAttempts", 0)
        avg_time = topic.get("avgTimeSpent", 0)
        recent_accuracy = topic.get("recentAccuracy", accuracy)

        # Derived features
        accuracy_trend = recent_accuracy - accuracy  # negative = declining
        attempt_density = min(total_attempts / 50, 1.0)  # normalized 0-1
        time_efficiency = correct / max(avg_time, 1) * 60  # correct per minute

        return [
            accuracy / 100,            # 0: normalized accuracy (0-1)
            total_attempts,             # 1: raw attempt count
            correct,                    # 2: correct attempts
            avg_time,                   # 3: avg time per question (seconds)
            recent_accuracy / 100,      # 4: recent accuracy (last 10 attempts)
            accuracy_trend / 100,       # 5: accuracy trend
            attempt_density,            # 6: how much they've practiced this topic
            time_efficiency,            # 7: correct answers per minute
        ]

    def _rule_based_prediction(self, topic_accuracy):
        """Fallback: simple rule-based weak topic detection."""
        weak_topics = []
        for topic in topic_accuracy:
            acc = topic.get("accuracy", 100)
            attempts = topic.get("totalAttempts", 0)
            recent_acc = topic.get("recentAccuracy", acc)

            # Severity scoring
            severity_score = 0
            if acc < 30 and attempts >= 5:
                severity_score = 3  # severe
            elif acc < 50 and attempts >= 5:
                severity_score = 2  # moderate
            elif acc < 60 and attempts >= 10:
                severity_score = 1  # mild
            elif recent_acc < acc - 15 and attempts >= 8:
                severity_score = 2  # declining performance

            if severity_score > 0:
                severity_labels = {1: "mild", 2: "moderate", 3: "severe"}
                recommendations = {
                    "severe": "Go back to basics. Watch concept videos and solve easy questions first.",
                    "moderate": "Focus on medium-difficulty problems. Review formulas and key theorems.",
                    "mild": "You're close! Practice timed questions to build speed and confidence."
                }
                severity = severity_labels[severity_score]
                weak_topics.append({
                    "topicId": topic.get("_id", {}).get("topicId") or topic.get("topicId"),
                    "chapterId": topic.get("_id", {}).get("chapterId") or topic.get("chapterId"),
                    "subjectId": topic.get("_id", {}).get("subjectId") or topic.get("subjectId"),
                    "accuracy": round(acc, 1),
                    "totalAttempts": attempts,
                    "recentAccuracy": round(recent_acc, 1),
                    "severity": severity,
                    "severityScore": severity_score,
                    "recommendedAction": recommendations[severity],
                    "source": "rule_based"
                })

        # Sort by severity (worst first), then by accuracy
        weak_topics.sort(key=lambda x: (-x["severityScore"], x["accuracy"]))
        return weak_topics

    def predict(self, topic_accuracy, recent_attempts=None, overall_stats=None):
        """Predict weak topics for a student."""
        if not topic_accuracy:
            return {"weakTopics": [], "modelVersion": "none", "message": "No data"}

        # Enrich with recent accuracy if recent_attempts are provided
        if recent_attempts:
            recent_by_topic = {}
            for attempt in recent_attempts[-100:]:  # last 100
                tid = str(attempt.get("topicId", ""))
                if tid not in recent_by_topic:
                    recent_by_topic[tid] = {"correct": 0, "total": 0}
                recent_by_topic[tid]["total"] += 1
                if attempt.get("isCorrect"):
                    recent_by_topic[tid]["correct"] += 1

            for topic in topic_accuracy:
                tid = str(topic.get("_id", {}).get("topicId") or topic.get("topicId", ""))
                if tid in recent_by_topic and recent_by_topic[tid]["total"] >= 3:
                    topic["recentAccuracy"] = (
                        recent_by_topic[tid]["correct"] / recent_by_topic[tid]["total"] * 100
                    )

        # ── Use ML model if available ──
        if self.model is not None:
            try:
                features = np.array([self._extract_features(t) for t in topic_accuracy])
                if self.scaler:
                    features = self.scaler.transform(features)

                # Predict probability of being weak (class 1)
                probabilities = self.model.predict_proba(features)[:, 1]

                weak_topics = []
                for i, topic in enumerate(topic_accuracy):
                    prob = probabilities[i]
                    if prob >= 0.5:  # threshold
                        severity = "severe" if prob >= 0.8 else "moderate" if prob >= 0.65 else "mild"
                        weak_topics.append({
                            "topicId": topic.get("_id", {}).get("topicId") or topic.get("topicId"),
                            "chapterId": topic.get("_id", {}).get("chapterId") or topic.get("chapterId"),
                            "subjectId": topic.get("_id", {}).get("subjectId") or topic.get("subjectId"),
                            "accuracy": round(topic.get("accuracy", 0), 1),
                            "totalAttempts": topic.get("totalAttempts", 0),
                            "weaknessProbability": round(float(prob), 3),
                            "severity": severity,
                            "recommendedAction": self._get_recommendation(severity, topic),
                            "source": "ml_model"
                        })

                weak_topics.sort(key=lambda x: -x["weaknessProbability"])
                return {
                    "weakTopics": weak_topics[:15],  # Top 15 weakest
                    "totalTopicsAnalyzed": len(topic_accuracy),
                    "modelVersion": "rf_v1",
                    "source": "ml_model"
                }
            except Exception as e:
                print(f"ML prediction failed, falling back: {e}")

        # ── Fallback: rule-based ──
        weak_topics = self._rule_based_prediction(topic_accuracy)
        return {
            "weakTopics": weak_topics[:15],
            "totalTopicsAnalyzed": len(topic_accuracy),
            "modelVersion": "rule_based_v1",
            "source": "rule_based"
        }

    def _get_recommendation(self, severity, topic):
        acc = topic.get("accuracy", 0)
        attempts = topic.get("totalAttempts", 0)
        if severity == "severe":
            return "Revise the fundamentals. Start with NCERT-level questions before attempting JEE problems."
        elif severity == "moderate":
            if attempts < 10:
                return "Practice more questions on this topic. You need at least 20-30 attempts to build proficiency."
            return "Focus on understanding solution methods. Review solved examples before attempting new problems."
        else:
            return "You're almost there. Time yourself and practice under exam conditions."


class ScorePredictor:
    """Predicts expected JEE score using Gradient Boosting."""

    def __init__(self, model_dir):
        self.model_dir = model_dir
        self.model = None
        self.scaler = None
        self.reload()

    def is_loaded(self):
        return self.model is not None

    def reload(self):
        model_path = os.path.join(self.model_dir, "score_model.joblib")
        scaler_path = os.path.join(self.model_dir, "score_scaler.joblib")
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            print("✅ Score prediction model loaded")
        else:
            print("⚠️  No score model found — using statistical fallback")

    def _extract_features(self, mock_test_history, topic_accuracy):
        """Extract features from a student's test history."""
        if not mock_test_history:
            return None

        scores = [t.get("percentage", 0) for t in mock_test_history]
        recent_scores = scores[-5:] if len(scores) >= 5 else scores

        # Subject-wise accuracy
        subject_acc = {}
        for topic in topic_accuracy:
            sid = str(topic.get("subjectId") or topic.get("_id", {}).get("subjectId", "unknown"))
            if sid not in subject_acc:
                subject_acc[sid] = {"correct": 0, "total": 0}
            subject_acc[sid]["total"] += topic.get("totalAttempts", 0)
            subject_acc[sid]["correct"] += topic.get("correctAttempts", 0)

        subject_accuracies = []
        for sid, data in subject_acc.items():
            if data["total"] > 0:
                subject_accuracies.append(data["correct"] / data["total"] * 100)

        avg_subject_acc = np.mean(subject_accuracies) if subject_accuracies else 0
        min_subject_acc = min(subject_accuracies) if subject_accuracies else 0

        # Trend (linear regression slope on last scores)
        if len(scores) >= 3:
            x = np.arange(len(scores))
            slope = np.polyfit(x, scores, 1)[0]
        else:
            slope = 0

        return [
            np.mean(scores),           # 0: average mock test percentage
            np.std(scores),            # 1: score consistency
            np.mean(recent_scores),    # 2: recent average
            max(scores),               # 3: best score
            min(scores),               # 4: worst score
            slope,                     # 5: improvement trend
            len(scores),               # 6: number of tests taken
            scores[-1],                # 7: most recent score
            scores[-1] - scores[-2] if len(scores) >= 2 else 0,  # 8: last delta
        ]

    def predict(self, mock_test_history, topic_accuracy):
        """Predict expected JEE score."""
        if not mock_test_history or len(mock_test_history) < 3:
            return {
                "predictedScore": None,
                "message": "Need at least 3 mock tests",
                "fallback": True
            }

        features = self._extract_features(mock_test_history, topic_accuracy)
        if features is None:
            return {"predictedScore": None, "fallback": True}

        # ── Use ML model if available ──
        if self.model is not None:
            try:
                X = np.array([features])
                if self.scaler:
                    X = self.scaler.transform(X)
                predicted = float(self.model.predict(X)[0])
                predicted_score = max(0, min(300, predicted))  # JEE Main max 300

                # Confidence based on number of tests
                n_tests = len(mock_test_history)
                confidence = min(0.95, 0.5 + n_tests * 0.05)

                return {
                    "predictedScore": round(predicted_score, 1),
                    "predictedPercentage": round(predicted_score / 300 * 100, 1),
                    "confidence": round(confidence, 2),
                    "readinessLevel": self._readiness(predicted_score / 300 * 100),
                    "trend": "improving" if features[5] > 1 else "declining" if features[5] < -1 else "stable",
                    "modelVersion": "gb_v1",
                    "source": "ml_model"
                }
            except Exception as e:
                print(f"Score prediction failed: {e}")

        # ── Statistical fallback ──
        scores = [t.get("percentage", 0) for t in mock_test_history]
        recent = scores[-5:]
        weighted_avg = np.average(recent, weights=range(1, len(recent) + 1))
        predicted_score = weighted_avg / 100 * 300

        return {
            "predictedScore": round(predicted_score, 1),
            "predictedPercentage": round(weighted_avg, 1),
            "confidence": round(min(0.7, 0.3 + len(scores) * 0.04), 2),
            "readinessLevel": self._readiness(weighted_avg),
            "trend": "improving" if len(scores) >= 3 and scores[-1] > scores[-3] else "stable",
            "modelVersion": "statistical_v1",
            "source": "statistical_fallback"
        }

    def _readiness(self, percentage):
        if percentage >= 80:
            return {"level": "excellent", "message": "You're JEE ready! 🔥 Keep revising weak areas."}
        elif percentage >= 65:
            return {"level": "good", "message": "Strong foundation. Focus on time management and tough questions."}
        elif percentage >= 50:
            return {"level": "moderate", "message": "Decent progress. Strengthen weak topics and practice full tests."}
        elif percentage >= 35:
            return {"level": "needs_work", "message": "Focus on core concepts. Prioritize NCERT and standard problems."}
        else:
            return {"level": "critical", "message": "Build fundamentals first. Start chapter-wise, then move to tests."}
