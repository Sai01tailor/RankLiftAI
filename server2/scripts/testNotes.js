const mongoose = require('mongoose');
const config = require('../config');
const { PracticeAttempt } = require('../models/PracticeAttempt');

mongoose.connect(config.mongo.uri).then(async () => {
    try {
        const data = await PracticeAttempt.find({ userNote: { $nin: [null, "", undefined] }, userId: new mongoose.Types.ObjectId('6990e42c696a37d45b40b09b') }).select('userNote isBookmarked').lean();
        console.log('Notes count:', data.length);
        if (data.length > 0) console.log(data);
    } catch (err) {
        console.log("ERROR:", err);
    }
    process.exit(0);
});
