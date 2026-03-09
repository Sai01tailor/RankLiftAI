const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const config = require("../config");
const { PracticeAttempt } = require("../models/PracticeAttempt");

async function clearBookmarks() {
    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(config.mongo.uri, config.mongo.options);
        console.log("✅ Connected\n");

        // Clear userNote and isBookmarked globally from PracticeAttempt
        const result = await PracticeAttempt.updateMany({}, {
            $set: { isBookmarked: false, userNote: null }
        });

        console.log(`✅ Cleared bookmarks and notes! Modified ${result.modifiedCount} records.`);

        // Additionally, we might want to delete records that exist purely for bookmark/notes (where isAttempted is false)
        // Wait, mongoose $unset might be better but userNote can just be null, we added it with default: null.
        // Let's delete records that have no valid attributes and were only created for bookmarking
        const deletedResult = await PracticeAttempt.deleteMany({
            isAttempted: false
        });

        console.log(`✅ Cleanup: Deleted ${deletedResult.deletedCount} empty practice attempts.`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

clearBookmarks();
