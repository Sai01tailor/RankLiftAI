
const mongoose = require("mongoose");
const url = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.7.0';

const connection = async () => {
    try {
        const client = await mongoose.connect(url);
        console.log("Connected to MongoDB");
        return client;
    } catch (err) {
        console.error("Error connecting to MongoDB:", err.message);
    }
}

module.exports = connection;
