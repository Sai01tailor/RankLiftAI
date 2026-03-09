const mongoose = require('mongoose');
const config = require('./config');
const { PracticeAttempt } = require('./models/PracticeAttempt');

mongoose.connect(config.mongo.uri).then(async () => {
    try {
        const userId = new mongoose.Types.ObjectId('6990e42c696a37d45b40b09b'); // Let's just find any bookmarked item for debugging
        const matchStage = {
            $or: [
                { isBookmarked: true },
                { userNote: { $nin: [null, "", undefined] } }
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
        console.log(JSON.stringify(data, null, 2));

        // Let's also verify toggle action specifically for this user to make sure we didn't miss something
        const count = await PracticeAttempt.countDocuments({ isBookmarked: true });
        console.log("Total globally bookmarked:", count);
    } catch (err) {
        console.log(err);
    }
    process.exit(0);
});
