"""
══════════════════════════════════════════════════════════════
 ML Trainers — Train models from MongoDB data
 
 Training pipeline:
 1. Connect to MongoDB and fetch practice/test data
 2. Feature engineering
 3. Train model (Random Forest / Gradient Boosting)
 4. Evaluate with cross-validation
 5. Save trained model to disk
 
 Can be triggered via:
 - POST /train/weak-topics  (from Flask API)
 - python trainer.py         (CLI)
 - Cron job (scheduled retraining)
══════════════════════════════════════════════════════════════
"""

import os
import numpy as np
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_absolute_error, r2_score
)
import joblib
from datetime import datetime


class WeakTopicTrainer:
    """
    Trains a Random Forest classifier to predict weak topics.
    
    Training data comes from PracticeAttempt collection:
    - Groups attempts by (userId, topicId)
    - Labels: accuracy < 50% with 5+ attempts = WEAK (1), otherwise STRONG (0)
    - Features: accuracy, attempt count, avg time, trend, etc.
    """

    def __init__(self, mongo_uri, model_dir):
        self.client = MongoClient(mongo_uri)
        self.db = self.client.get_default_database()
        self.model_dir = model_dir

    def _fetch_training_data(self):
        """Aggregate practice attempts into topic-level features per student."""
        pipeline = [
            # Group by userId + topicId
            {"$group": {
                "_id": {"userId": "$userId", "topicId": "$topicId", "subjectId": "$subjectId"},
                "totalAttempts": {"$sum": 1},
                "correctAttempts": {"$sum": {"$cond": ["$isCorrect", 1, 0]}},
                "avgTimeSpent": {"$avg": "$timeSpent"},
                "difficulties": {"$push": "$difficulty"},
                "timestamps": {"$push": "$createdAt"},
                "results": {"$push": "$isCorrect"}
            }},
            # Only include topics with meaningful data
            {"$match": {"totalAttempts": {"$gte": 5}}}
        ]

        data = list(self.db.practiceattempts.aggregate(pipeline, allowDiskUse=True))
        print(f"📊 Fetched {len(data)} student-topic records for training")
        return data

    def _engineer_features(self, records):
        """Convert raw records into feature matrix + labels."""
        features = []
        labels = []

        for record in records:
            total = record["totalAttempts"]
            correct = record["correctAttempts"]
            accuracy = correct / total * 100
            avg_time = record.get("avgTimeSpent", 0) or 0

            # Recent accuracy (last 10 attempts)
            results = record.get("results", [])
            recent_results = results[-10:] if len(results) >= 10 else results
            recent_accuracy = sum(recent_results) / max(len(recent_results), 1) * 100

            # Difficulty distribution
            diffs = record.get("difficulties", [])
            easy_ratio = diffs.count("Easy") / max(len(diffs), 1)
            medium_ratio = diffs.count("Medium") / max(len(diffs), 1)
            hard_ratio = diffs.count("Hard") / max(len(diffs), 1)

            # Accuracy trend (first half vs second half)
            if len(results) >= 6:
                mid = len(results) // 2
                first_half = sum(results[:mid]) / mid * 100
                second_half = sum(results[mid:]) / (len(results) - mid) * 100
                trend = second_half - first_half
            else:
                trend = 0

            # Time efficiency
            time_efficiency = correct / max(avg_time, 1) * 60

            feature_vec = [
                accuracy / 100,             # normalized accuracy
                total,                       # attempt count
                correct,                     # correct count
                avg_time,                    # avg time per question
                recent_accuracy / 100,       # recent accuracy
                trend / 100,                 # accuracy trend
                min(total / 50, 1.0),        # attempt density
                time_efficiency,             # correct per minute
                easy_ratio,                  # fraction of easy questions
                medium_ratio,                # fraction of medium questions
                hard_ratio,                  # fraction of hard questions
            ]

            features.append(feature_vec)

            # Label: weak if accuracy < 50%, or declining significantly
            is_weak = 1 if (accuracy < 50) or (trend < -20 and accuracy < 65) else 0
            labels.append(is_weak)

        return np.array(features), np.array(labels)

    def train(self):
        """Full training pipeline."""
        print("\n🔄 Training Weak Topic Model...")
        start_time = datetime.now()

        # 1. Fetch data
        records = self._fetch_training_data()
        if len(records) < 50:
            # Not enough data — generate synthetic training data
            print("⚠️  Not enough real data. Generating synthetic data for initial model...")
            records = self._generate_synthetic_data(500)

        # 2. Feature engineering
        X, y = self._engineer_features(records)
        print(f"   Features shape: {X.shape}, Weak topics: {sum(y)}/{len(y)} ({sum(y)/len(y)*100:.1f}%)")

        # 3. Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # 4. Train Random Forest
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            min_samples_split=5,
            min_samples_leaf=3,
            class_weight="balanced",  # Handle class imbalance
            random_state=42,
            n_jobs=-1
        )

        # 5. Cross-validation
        cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring="f1")
        print(f"   Cross-val F1 scores: {cv_scores.round(3)}")
        print(f"   Mean F1: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

        # 6. Train on full data
        model.fit(X_scaled, y)

        # 7. Evaluate on held-out set
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        model_eval = RandomForestClassifier(**model.get_params())
        model_eval.fit(X_train, y_train)
        y_pred = model_eval.predict(X_test)

        metrics = {
            "accuracy": round(accuracy_score(y_test, y_pred), 3),
            "precision": round(precision_score(y_test, y_pred, zero_division=0), 3),
            "recall": round(recall_score(y_test, y_pred, zero_division=0), 3),
            "f1": round(f1_score(y_test, y_pred, zero_division=0), 3),
            "cv_f1_mean": round(cv_scores.mean(), 3),
            "training_samples": len(X),
            "weak_ratio": round(sum(y) / len(y), 3),
            "feature_importance": dict(zip(
                ["accuracy", "attempts", "correct", "avg_time", "recent_acc",
                 "trend", "density", "efficiency", "easy%", "medium%", "hard%"],
                model.feature_importances_.round(3).tolist()
            )),
            "trained_at": datetime.now().isoformat()
        }

        # 8. Save model
        joblib.dump(model, os.path.join(self.model_dir, "weak_topic_model.joblib"))
        joblib.dump(scaler, os.path.join(self.model_dir, "weak_topic_scaler.joblib"))
        print(f"✅ Model saved! Metrics: {metrics}")

        duration = (datetime.now() - start_time).total_seconds()
        metrics["training_time_seconds"] = round(duration, 1)
        return metrics

    def _generate_synthetic_data(self, n=500):
        """Generate synthetic training data for bootstrapping."""
        np.random.seed(42)
        records = []
        for _ in range(n):
            total = np.random.randint(5, 100)
            # Determine if this topic should be weak
            is_weak = np.random.random() < 0.35  # 35% weak topics
            if is_weak:
                accuracy_pct = np.random.uniform(10, 55)
            else:
                accuracy_pct = np.random.uniform(45, 95)

            correct = int(total * accuracy_pct / 100)
            results = [True] * correct + [False] * (total - correct)
            np.random.shuffle(results)

            records.append({
                "totalAttempts": total,
                "correctAttempts": correct,
                "avgTimeSpent": np.random.uniform(30, 300),
                "difficulties": np.random.choice(["Easy", "Medium", "Hard"], size=total, p=[0.3, 0.5, 0.2]).tolist(),
                "results": results
            })
        return records


class ScoreTrainer:
    """
    Trains Gradient Boosting regressor to predict JEE scores.
    Uses mock test history as training data.
    """

    def __init__(self, mongo_uri, model_dir):
        self.client = MongoClient(mongo_uri)
        self.db = self.client.get_default_database()
        self.model_dir = model_dir

    def _fetch_training_data(self):
        """Fetch students with 5+ mock test attempts."""
        pipeline = [
            {"$match": {"status": {"$in": ["SUBMITTED", "EVALUATED"]}}},
            {"$group": {
                "_id": "$userId",
                "tests": {"$push": {
                    "percentage": "$percentage",
                    "totalScore": "$totalScore",
                    "maxScore": "$maxScore",
                    "submittedAt": "$submittedAt"
                }},
                "count": {"$sum": 1}
            }},
            {"$match": {"count": {"$gte": 5}}}
        ]

        data = list(self.db.testattempts.aggregate(pipeline, allowDiskUse=True))
        print(f"📊 Fetched {len(data)} students with 5+ tests")
        return data

    def _engineer_features(self, students):
        """For each student, predict their NEXT test score from history."""
        features = []
        labels = []

        for student in students:
            tests = sorted(student["tests"], key=lambda t: t.get("submittedAt", ""))
            scores = [t["percentage"] for t in tests]

            # Use all-but-last as features, last score as label
            for i in range(4, len(scores)):
                history = scores[:i]
                target = scores[i]
                recent = history[-5:]

                if len(history) >= 3:
                    x = np.arange(len(history))
                    slope = np.polyfit(x, history, 1)[0]
                else:
                    slope = 0

                feature_vec = [
                    np.mean(history),
                    np.std(history),
                    np.mean(recent),
                    max(history),
                    min(history),
                    slope,
                    len(history),
                    history[-1],        # most recent score
                    history[-1] - history[-2] if len(history) >= 2 else 0,  # last delta
                ]

                features.append(feature_vec)
                labels.append(target / 100 * 300)  # Convert to JEE score (out of 300)

        return np.array(features), np.array(labels)

    def train(self):
        """Full training pipeline."""
        print("\n🔄 Training Score Prediction Model...")
        start_time = datetime.now()

        students = self._fetch_training_data()
        if len(students) < 20:
            print("⚠️  Not enough real data. Generating synthetic data...")
            students = self._generate_synthetic_students(200)

        X, y = self._engineer_features(students)
        print(f"   Features: {X.shape}, Target range: {y.min():.0f}-{y.max():.0f}")

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = GradientBoostingRegressor(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.1,
            min_samples_split=5,
            random_state=42
        )

        # Cross-validation
        cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring="r2")
        print(f"   Cross-val R²: {cv_scores.round(3)}")

        model.fit(X_scaled, y)

        # Evaluate
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        model_eval = GradientBoostingRegressor(**model.get_params())
        model_eval.fit(X_train, y_train)
        y_pred = model_eval.predict(X_test)

        metrics = {
            "mae": round(mean_absolute_error(y_test, y_pred), 2),
            "r2": round(r2_score(y_test, y_pred), 3),
            "cv_r2_mean": round(cv_scores.mean(), 3),
            "training_samples": len(X),
            "trained_at": datetime.now().isoformat()
        }

        joblib.dump(model, os.path.join(self.model_dir, "score_model.joblib"))
        joblib.dump(scaler, os.path.join(self.model_dir, "score_scaler.joblib"))
        print(f"✅ Score model saved! MAE: {metrics['mae']}, R²: {metrics['r2']}")

        metrics["training_time_seconds"] = round((datetime.now() - start_time).total_seconds(), 1)
        return metrics

    def _generate_synthetic_students(self, n=200):
        """Generate synthetic test history."""
        np.random.seed(42)
        students = []
        for _ in range(n):
            n_tests = np.random.randint(5, 20)
            # Base ability + gradual improvement + noise
            base = np.random.uniform(20, 75)
            improvement = np.random.uniform(0, 0.8)
            scores = []
            for t in range(n_tests):
                score = base + improvement * t + np.random.normal(0, 5)
                scores.append({"percentage": max(5, min(100, score)), "submittedAt": f"2025-{t:02d}"})
            students.append({"tests": scores, "count": n_tests})
        return students


# ══════════════════════════════════════
#  CLI Training
# ══════════════════════════════════════
if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv
    load_dotenv()

    MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/jeewallah")
    MODEL_DIR = os.getenv("MODEL_DIR", "./models")
    os.makedirs(MODEL_DIR, exist_ok=True)

    if len(sys.argv) > 1 and sys.argv[1] == "score":
        trainer = ScoreTrainer(MONGO_URI, MODEL_DIR)
        metrics = trainer.train()
    else:
        trainer = WeakTopicTrainer(MONGO_URI, MODEL_DIR)
        metrics = trainer.train()

    print(f"\n📋 Final metrics: {metrics}")
