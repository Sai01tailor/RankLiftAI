const mongoose = require('mongoose');
const config = require('../config');
const { PracticeAttempt } = require('../models/PracticeAttempt');

mongoose.connect(config.mongo.uri).then(async () => {
    try {
        const data = await PracticeAttempt.find({ userNote: { $nin: [null, "", undefined] } }).select('userNote isBookmarked userId').lean();
        console.log('Total notes:', data.length);
        console.log(data.slice(0, 10));
    } catch (err) {
        console.log(err);
    }
    process.exit(0);
});
