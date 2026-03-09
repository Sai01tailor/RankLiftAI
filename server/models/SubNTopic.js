const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════════
//  ACADEMIC HIERARCHY: Subject → Chapter → Topic
//  The taxonomy backbone of the entire platform
// ══════════════════════════════════════════════════════════════════

// --- 1. SUBJECT SCHEMA ---
const SubjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Subject name is required"],
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
        // Auto-generated in pre-save: "Mathematics" → "mathematics"
    },
    examType: {
        type: String,
        required: true,
        enum: ["JEE Main", "JEE Advanced", "Both"],
        default: "Both"
    },
    iconUrl: { type: String, default: null },
    description: { type: String, trim: true, default: null },
    displayOrder: { type: Number, default: 0 }, // Physics=1, Chemistry=2, Maths=3
    questionCount: { type: Number, default: 0 }, // Denormalized for fast display
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: Subject → all its Chapters
SubjectSchema.virtual("chapters", {
    ref: "Chapter",
    localField: "_id",
    foreignField: "subjectId"
});

// Auto-generate slug from name
SubjectSchema.pre("save", function (next) {
    if (this.isModified("name")) {
        this.slug = this.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }
    next();
});

// --- 2. CHAPTER SCHEMA ---
const ChapterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Chapter name is required"],
        trim: true
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: [true, "Subject reference is required"],
        index: true
    },
    weightage: {
        type: Number,
        default: 0,
        min: [0, "Weightage cannot be negative"],
        max: [100, "Weightage cannot exceed 100"]
    },
    // How important is this chapter for JEE? (shown to students)
    importance: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Medium"
    },
    displayOrder: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    description: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: Chapter → all its Topics
ChapterSchema.virtual("topics", {
    ref: "Topic",
    localField: "_id",
    foreignField: "chapterId"
});

// Compound unique: No duplicate chapter names within a subject
ChapterSchema.index({ subjectId: 1, name: 1 }, { unique: true });

// Auto-generate slug
ChapterSchema.pre("save", function (next) {
    if (this.isModified("name")) {
        this.slug = this.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }
    next();
});

// --- 3. TOPIC SCHEMA ---
const TopicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Topic name is required"],
        trim: true
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: [true, "Chapter reference is required"],
        index: true
    },
    displayOrder: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound unique: No duplicate topic names within a chapter
TopicSchema.index({ chapterId: 1, name: 1 }, { unique: true });

// Auto-generate slug
TopicSchema.pre("save", function (next) {
    if (this.isModified("name")) {
        this.slug = this.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }
    next();
});

const Subject = mongoose.model("Subject", SubjectSchema);
const Chapter = mongoose.model("Chapter", ChapterSchema);
const Topic = mongoose.model("Topic", TopicSchema);

module.exports = { Subject, Chapter, Topic };