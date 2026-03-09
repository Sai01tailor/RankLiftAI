const mongoose = require('mongoose');
const { Question } = require('./models/Question');
const { PracticeAttempt } = require('./models/PracticeAttempt');

mongoose.connect('mongodb+srv://jeeacers:!tsMewithYP1@jee.h8mx2c4.mongodb.net/test').then(async () => {
    console.log('Connected.');

    // reset stats first
    await Question.updateMany({}, {
        $set: {
            "stats.totalAttempts": 0,
            "stats.correctAttempts": 0,
            "stats.avgTimeSpent": 0,
            "stats.accuracyRate": 0,
            solvedByCount: 0,
            uniqueAttemptCount: 0
        }
    });

    const attempts = await PracticeAttempt.find({}).lean();
    console.log(`Found ${attempts.length} attempts`);

    // We'll re-calculate all stats offline and update
    const statsMap = {};

    for (const a of attempts) {
        if (!statsMap[a.questionId]) {
            statsMap[a.questionId] = {
                questionId: a.questionId,
                totalAttempts: 0,
                correctAttempts: 0,
                uniqueUsersSet: new Set(),
                uniqueCorrectUsersSet: new Set(),
                totalTimeSpent: 0
            };
        }

        const st = statsMap[a.questionId];
        st.totalAttempts++;
        if (a.isCorrect) st.correctAttempts++;
        st.uniqueUsersSet.add(a.userId.toString());
        if (a.isCorrect) st.uniqueCorrectUsersSet.add(a.userId.toString());
        st.totalTimeSpent += (a.timeSpent || 0);
    }

    for (const qId in statsMap) {
        const st = statsMap[qId];
        const avgTime = st.totalAttempts > 0 ? Math.round(st.totalTimeSpent / st.totalAttempts) : 0;
        const accuracy = st.totalAttempts > 0 ? Math.round((st.correctAttempts / st.totalAttempts) * 100) : 0;

        await Question.updateOne({ _id: qId }, {
            $set: {
                "stats.totalAttempts": st.totalAttempts,
                "stats.correctAttempts": st.correctAttempts,
                "stats.avgTimeSpent": avgTime,
                "stats.accuracyRate": accuracy,
                solvedByCount: st.uniqueCorrectUsersSet.size,
                uniqueAttemptCount: st.uniqueUsersSet.size
            }
        });
    }

    console.log('Sync complete');
    process.exit(0);
}).catch(console.error);
