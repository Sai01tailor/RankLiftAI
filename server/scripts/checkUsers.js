const mongoose = require('mongoose');
const config = require('../config');

mongoose.connect(config.mongo.uri).then(async () => {
    const db = mongoose.connection;
    const users = await db.collection('users').find({}).project({ username: 1, email: 1, role: 1 }).toArray();
    console.log('\n=== ALL USERS ===');
    users.forEach(u => console.log(`  ${u._id}  ${u.username}  ${u.email}  ${u.role}`));

    const { PracticeAttempt } = require('../models/PracticeAttempt');
    const bookmarked = await PracticeAttempt.find({ isBookmarked: true }).select('userId').lean();
    const uniqueUserIds = [...new Set(bookmarked.map(b => b.userId.toString()))];
    console.log('\n=== USER IDs WITH BOOKMARKS ===', uniqueUserIds);
    process.exit(0);
});
