const Settings = require('../models/Settings');

// Get Settings (Public)
exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ success: false, message: "Error fetching settings" });
    }
};

// Update Settings (Admin Only)
exports.updateSettings = async (req, res) => {
    try {
        const updateData = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings(updateData);
            await settings.save();
        } else {
            // Update fields
            Object.assign(settings, updateData);
            await settings.save();
        }

        res.status(200).json({ success: true, message: "Settings updated successfully", settings });
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ success: false, message: "Error updating settings" });
    }
};
