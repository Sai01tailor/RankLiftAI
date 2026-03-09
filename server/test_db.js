require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/Users');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    const users = await User.find({}).select("+password");
    users.forEach(u => {
        console.log(`User: ${u.email}, Password Hash: ${u.password}, Role: ${u.role}, Status: ${u.accountStatus}`);
    });
    process.exit(0);
}
test().catch(e => console.error(e));
