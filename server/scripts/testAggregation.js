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

        const pipeline = [
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$questionId",
                    doc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$doc" } }
        ];

        const data = await PracticeAttempt.aggregate(pipeline);
        console.log('Bookmarks retrieved length:', data.length);
        console.log('First 3 docs:', data.slice(0, 3));
    } catch (err) {
        console.log("ERROR:", err);
    }
    process.exit(0);
});
