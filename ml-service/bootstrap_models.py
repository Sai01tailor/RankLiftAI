"""Bootstrap initial ML models using synthetic data.
Run this once to create initial model files so the ML service starts with a trained model."""

import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.makedirs("models", exist_ok=True)

from trainer import WeakTopicTrainer, ScoreTrainer

class MockTrainer(WeakTopicTrainer):
    """Overrides data fetching to use synthetic data only."""
    def _fetch_training_data(self):
        return []  # Forces synthetic data generation

class MockScoreTrainer(ScoreTrainer):
    def _fetch_training_data(self):
        return []

print("=" * 50)
print("  BOOTSTRAPPING ML MODELS WITH SYNTHETIC DATA")
print("=" * 50)

# Train weak topic model
print("\n[1/2] Training Weak Topic Classifier...")
wt = MockTrainer("mongodb://localhost:27017/jeewallah", "./models")
wt_metrics = wt.train()
print(f"   Accuracy: {wt_metrics['accuracy']}")
print(f"   F1 Score: {wt_metrics['f1']}")

# Train score model
print("\n[2/2] Training Score Predictor...")
st = MockScoreTrainer("mongodb://localhost:27017/jeewallah", "./models")
st_metrics = st.train()
print(f"   MAE: {st_metrics['mae']}")
print(f"   R²:  {st_metrics['r2']}")

print("\n" + "=" * 50)
print("  ✅ MODELS SAVED TO ./models/")
print("=" * 50)

# List saved files
for f in os.listdir("./models"):
    size = os.path.getsize(f"./models/{f}")
    print(f"  📦 {f} ({size/1024:.1f} KB)")
