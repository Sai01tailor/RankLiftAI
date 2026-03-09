const mongoose = require('mongoose');
const config = require('../config');
const { PracticeAttempt } = require('../models/PracticeAttempt');

mongoose.connect(config.mongo.uri).then(async () => {
    try {
        const userId = new mongoose.Types.ObjectId('6990e42c696a37d45b40b09b');
        const matchStage = {
            userId: userId,
            $or: [
                { isBookmarked: true },
                { userNote: { $nin: [null, ""] } }
            ]
        };
        const pipeline = [{ $match: matchStage }, { $group: { _id: "$questionId" } }];
        const data = await PracticeAttempt.aggregate(pipeline);
        console.log('AGGREGATION COUNT:', data.length);

        // Also just finding the normal list to see if it varies a lot
        const rawItems = await PracticeAttempt.find(matchStage).select('questionId').lean();
        console.log('RAW COUNT:', rawItems.length);
    } catch (err) {
        console.log("ERROR:", err);
    }
    process.exit(0);
});
