const mongoose = require('mongoose');
const config = require('../config');

mongoose.connect(config.mongo.uri).then(async () => {
    const db = mongoose.connection;
    const users = await db.collection('users').find({}).project({ username: 1, email: 1, role: 1 }).toArray();
    users.forEach(u => {
        console.log('USER:', u._id.toString(), '|', u.username, '|', u.email, '|', u.role);
    });
    process.exit(0);
});
