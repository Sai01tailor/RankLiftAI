require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/Users');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({}).select("+password");
    require('fs').writeFileSync('users.json', JSON.stringify(users, null, 2));
    process.exit(0);
}
test().catch(e => console.error(e));
