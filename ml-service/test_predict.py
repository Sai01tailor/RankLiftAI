import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.makedirs("models", exist_ok=True)

from predictor import WeakTopicPredictor, ScorePredictor

print("=== Testing ML Predictors ===\n")

# 1. Test WeakTopicPredictor
wp = WeakTopicPredictor("./models")
print(f"WeakTopic model loaded: {wp.is_loaded()}")

test_topics = [
    {"accuracy": 25, "totalAttempts": 15, "recentAccuracy": 20, "_id": {"topicId": "t1", "chapterId": "c1", "subjectId": "s1"}},
    {"accuracy": 85, "totalAttempts": 20, "recentAccuracy": 90, "_id": {"topicId": "t2", "chapterId": "c2", "subjectId": "s2"}},
    {"accuracy": 45, "totalAttempts": 12, "recentAccuracy": 30, "_id": {"topicId": "t3", "chapterId": "c3", "subjectId": "s3"}},
    {"accuracy": 92, "totalAttempts": 30, "recentAccuracy": 95, "_id": {"topicId": "t4", "chapterId": "c4", "subjectId": "s4"}},
    {"accuracy": 35, "totalAttempts": 8,  "recentAccuracy": 25, "_id": {"topicId": "t5", "chapterId": "c5", "subjectId": "s5"}},
]

result = wp.predict(test_topics)
print(f"\nWeak topics found: {len(result['weakTopics'])} / {result['totalTopicsAnalyzed']}")
print(f"Source: {result['source']}")
for t in result["weakTopics"]:
    print(f"  - Topic {t['topicId']}: {t['accuracy']}% | Severity: {t['severity']}")
    print(f"    Recommendation: {t['recommendedAction']}")

# 2. Test ScorePredictor
print("\n" + "=" * 40)
sp = ScorePredictor("./models")
print(f"Score model loaded: {sp.is_loaded()}")

test_history = [
    {"percentage": 45}, {"percentage": 48}, {"percentage": 52},
    {"percentage": 55}, {"percentage": 58}, {"percentage": 60}
]

score_result = sp.predict(test_history, test_topics)
print(f"\nPredicted Score: {score_result.get('predictedScore')}/300")
print(f"Predicted %: {score_result.get('predictedPercentage')}%")
print(f"Confidence: {score_result.get('confidence')}")
print(f"Trend: {score_result.get('trend')}")
print(f"Readiness: {score_result.get('readinessLevel', {}).get('level')} - {score_result.get('readinessLevel', {}).get('message')}")
print(f"Source: {score_result.get('source')}")

print("\n✅ All tests passed!")
