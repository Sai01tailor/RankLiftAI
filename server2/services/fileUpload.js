const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { Readable } = require("stream");
const config = require("../config");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  File Upload Service — Cloudinary + Multer
//  - Single image upload (avatar, question image)
//  - Multiple image upload (solution images)
//  - Delete by public ID
//  - Memory storage (no disk writes)
// ══════════════════════════════════════════════

// ── Configure Cloudinary ──
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true
});

// ── Multer memory storage ──
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF, SVG`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 10                   // max 10 files per request
    }
});

// ── Upload middleware presets ──
const uploadSingle = (fieldName = "image") => upload.single(fieldName);
const uploadMultiple = (fieldName = "images", maxCount = 5) => upload.array(fieldName, maxCount);
const uploadFields = (fields) => upload.fields(fields);

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options
 * @param {string} options.folder - Cloudinary folder (e.g., "avatars", "questions")
 * @param {string} options.publicId - Optional custom public ID
 * @param {string} options.transformation - Optional transformation string
 * @returns {{ url, publicId, width, height, format, bytes }}
 */
const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: `jeewallah/${options.folder || "uploads"}`,
            resource_type: "image",
            quality: "auto:good",
            fetch_format: "auto",
            ...(options.publicId && { public_id: options.publicId }),
            ...(options.transformation && { transformation: options.transformation })
        };

        // Avatar-specific transformations
        if (options.folder === "avatars") {
            uploadOptions.transformation = [
                { width: 300, height: 300, crop: "fill", gravity: "face" },
                { quality: "auto:good", fetch_format: "auto" }
            ];
        }

        // Question image transformations
        if (options.folder === "questions") {
            uploadOptions.transformation = [
                { width: 1200, crop: "limit" },
                { quality: "auto:good", fetch_format: "auto" }
            ];
        }

        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                logger.error(`Cloudinary upload failed: ${error.message}`);
                reject(error);
            } else {
                logger.debug(`Cloudinary upload success: ${result.public_id}`);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    bytes: result.bytes
                });
            }
        });

        // Pipe buffer to Cloudinary stream
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(stream);
    });
};

/**
 * Upload a single file from multer request.
 * @param {Object} file - req.file from multer
 * @param {string} folder - Cloudinary folder
 * @returns {{ url, publicId }}
 */
const uploadFile = async (file, folder = "uploads") => {
    if (!file || !file.buffer) {
        throw new Error("No file provided");
    }
    return uploadToCloudinary(file.buffer, { folder });
};

/**
 * Upload multiple files from multer request.
 * @param {Array} files - req.files from multer
 * @param {string} folder - Cloudinary folder
 * @returns {Array<{ url, publicId }>}
 */
const uploadFiles = async (files, folder = "uploads") => {
    if (!files || files.length === 0) {
        return [];
    }
    const results = await Promise.all(
        files.map(file => uploadToCloudinary(file.buffer, { folder }))
    );
    return results;
};

/**
 * Delete a single image from Cloudinary by public ID.
 * @param {string} publicId
 * @returns {boolean}
 */
const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return false;

    try {
        const result = await cloudinary.uploader.destroy(publicId);
        const success = result.result === "ok";
        if (success) {
            logger.debug(`Cloudinary delete success: ${publicId}`);
        } else {
            logger.warn(`Cloudinary delete returned: ${result.result} for ${publicId}`);
        }
        return success;
    } catch (err) {
        logger.error(`Cloudinary delete failed: ${err.message} (publicId: ${publicId})`);
        return false;
    }
};

/**
 * Delete multiple images from Cloudinary.
 * @param {string[]} publicIds
 * @returns {{ deleted, failed }}
 */
const deleteMultipleFromCloudinary = async (publicIds) => {
    if (!publicIds || publicIds.length === 0) return { deleted: 0, failed: 0 };

    try {
        const result = await cloudinary.api.delete_resources(publicIds);
        const deleted = Object.values(result.deleted).filter(v => v === "deleted").length;
        const failed = publicIds.length - deleted;
        logger.info(`Cloudinary bulk delete: ${deleted} deleted, ${failed} failed`);
        return { deleted, failed };
    } catch (err) {
        logger.error(`Cloudinary bulk delete failed: ${err.message}`);
        return { deleted: 0, failed: publicIds.length };
    }
};

/**
 * Extract Cloudinary public ID from a URL.
 * e.g., "https://res.cloudinary.com/.../jeewallah/avatars/abc123.jpg" → "jeewallah/avatars/abc123"
 */
const extractPublicId = (url) => {
    if (!url || !url.includes("cloudinary")) return null;
    try {
        const parts = url.split("/upload/");
        if (parts.length < 2) return null;
        // Remove version (v1234567890/) and file extension
        const pathWithVersion = parts[1];
        const withoutExtension = pathWithVersion.replace(/\.\w+$/, "");
        // Remove version prefix if present
        return withoutExtension.replace(/^v\d+\//, "");
    } catch {
        return null;
    }
};

/**
 * Middleware: Process uploaded avatar and attach URL to req.body
 */
const processAvatarUpload = async (req, res, next) => {
    if (!req.file) return next();

    try {
        const result = await uploadToCloudinary(req.file.buffer, {
            folder: "avatars",
            publicId: `user_${req.user._id}`
        });
        req.body.avatarUrl = result.url;
        req.uploadedImage = result;
        next();
    } catch (err) {
        logger.error(`Avatar upload failed: ${err.message}`);
        next(err);
    }
};

/**
 * Middleware: Process uploaded question images and attach URLs
 */
const processQuestionImages = async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) return next();

    try {
        const uploads = {};

        // Handle question image
        if (req.files.questionImage && req.files.questionImage[0]) {
            const result = await uploadToCloudinary(
                req.files.questionImage[0].buffer,
                { folder: "questions" }
            );
            uploads.questionImageUrl = result.url;
        }

        // Handle solution image
        if (req.files.solutionImage && req.files.solutionImage[0]) {
            const result = await uploadToCloudinary(
                req.files.solutionImage[0].buffer,
                { folder: "questions/solutions" }
            );
            uploads.solutionImageUrl = result.url;
        }

        // Handle multiple solution images
        if (req.files.solutionImages) {
            const results = await Promise.all(
                req.files.solutionImages.map(f =>
                    uploadToCloudinary(f.buffer, { folder: "questions/solutions" })
                )
            );
            uploads.solutionImageUrls = results.map(r => r.url);
        }

        req.uploadedImages = uploads;
        next();
    } catch (err) {
        logger.error(`Question image upload failed: ${err.message}`);
        next(err);
    }
};

module.exports = {
    // Multer middleware
    uploadSingle,
    uploadMultiple,
    uploadFields,

    // Upload functions
    uploadFile,
    uploadFiles,
    uploadToCloudinary,

    // Delete functions
    deleteFromCloudinary,
    deleteMultipleFromCloudinary,
    extractPublicId,

    // Processing middleware
    processAvatarUpload,
    processQuestionImages
};
