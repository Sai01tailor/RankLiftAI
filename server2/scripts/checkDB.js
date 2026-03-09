const mongoose = require('mongoose');
const config = require('../config');
const { PracticeAttempt } = require('../models/PracticeAttempt');

mongoose.connect(config.mongo.uri).then(async () => {
    // Group bookmarked records by userId
    const bookmarked = await PracticeAttempt.find({ isBookmarked: true }).select('userId questionId').lean();

    const byUser = {};
    bookmarked.forEach(b => {
        const uid = b.userId.toString();
        byUser[uid] = (byUser[uid] || 0) + 1;
    });

    console.log('\n=== BOOKMARKED BY USER ===');
    Object.entries(byUser).forEach(([uid, count]) => {
        console.log(`  userId: ${uid}  count: ${count}`);
    });

    // test the aggregation for all users
    for (const [userId] of Object.entries(byUser)) {
        try {
            const userObjId = new mongoose.Types.ObjectId(userId);
            const pipeline = [
                { $match: { userId: userObjId, $or: [{ isBookmarked: true }, { userNote: { $nin: [null, ''] } }] } },
                { $addFields: { _rank: { $cond: [{ $eq: ['$isBookmarked', true] }, 0, 1] } } },
                { $sort: { questionId: 1, _rank: 1, createdAt: -1 } },
                { $group: { _id: '$questionId', doc: { $first: '$$ROOT' } } },
                { $replaceRoot: { newRoot: '$doc' } },
                { $count: 'total' }
            ];
            const [res] = await PracticeAttempt.aggregate(pipeline);
            console.log(`  userId: ${userId}  aggregation result: ${res?.total || 0} unique questions`);
        } catch (e) {
            console.log(`  userId: ${userId}  aggregation error: ${e.message}`);
        }
    }

    process.exit(0);
});
