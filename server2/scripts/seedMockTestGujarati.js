const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const config = require("../config");

// Load models
const { Question } = require("../models/Question");
const { MockTest } = require("../models/MockTest");
const Users = require("../models/Users");

async function initDB() {
    await mongoose.connect(config.mongo.uri, config.mongo.options);
    console.log("Connected to MongoDB");
}

const gujaratiTranslations = [
    "જો ખાતરના વેચાણ પર સબસીડી રદ કરવામાં આવે, તો તેનાથી ખેડૂતોને શું અસર થશે?",
    "એક મોટર કાર 60 km/h ની ઝડપે જાય છે. જો તેણે 300 km મુસાફરી કરવી હોય તો કેટલો સમય લાગશે?",
    "નીચેનામાંથી કયો વાયુ ગ્રીનહાઉસ વાયુ તરીકે ઓળખાય છે?",
    "સાપેક્ષતાનો સિદ્ધાંત કોણે આપ્યો હતો?",
    "જ્યારે 2+2 સરવાળો કરીએ ત્યારે જવાબ શું આવે છે?"
];

const optionTranslations = [
    ["(એ) ", "(બી) ", "(સી) ", "(ડી) "],
    ["1", "2", "3", "4"]
];

async function seed() {
    await initDB();

    console.log("--- Fetching Admin User ---");
    const admin = await Users.findOne({ role: "admin" });
    if (!admin) {
        console.error("No admin user found. Please seed admin first.");
        process.exit(1);
    }
    const adminId = admin._id;

    console.log("--- Fetching 5 SCQ questions ---");
    const questions = await Question.find({ type: "SCQ" }).limit(5);

    if (questions.length < 5) {
        console.error("Not enough SCQ questions in the database. Please seed questions first.");
        process.exit(1);
    }

    console.log("--- Updating Questions with Gujarati Translations ---");
    const questionIds = [];
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        q.content = q.content || {};
        q.content.en = q.content.en || { text: "English Question" };
        q.content.gj = { text: gujaratiTranslations[i] || "ગુજરાતી પ્રશ્ન" };

        if (q.options && q.options.length > 0) {
            for (let j = 0; j < q.options.length; j++) {
                q.options[j].text = q.options[j].text || {};
                q.options[j].text.en = q.options[j].text.en || `Option ${j + 1}`;
                q.options[j].text.gj = `${optionTranslations[0][j % 4]} વિકલ્પ`;
            }
        }

        q.markModified('content');
        q.markModified('options');
        await q.save();
        questionIds.push(q._id);
        console.log(`Updated Question ID: ${q._id}`);
    }

    console.log("--- Creating Mock Test ---");
    const existingTest = await MockTest.findOne({ slug: "gujarati-english-mock-test" });
    if (existingTest) {
        console.log("Mock test already exists. Deleting older version...");
        await MockTest.deleteOne({ _id: existingTest._id });
    }

    const newTest = await MockTest.create({
        title: "Bilingual Mock Test (EN & GJ)",
        slug: "gujarati-english-mock-test",
        description: "A specially curated mock test available in both English and Gujarati.",
        examType: "JEE Main",
        testType: "SHORT_TEST",
        duration: 30,
        totalMarks: 20,
        totalQuestions: 5,
        schedule: {
            startTime: new Date(),
            endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        accessLevel: "free",
        isPublished: true,
        createdBy: adminId,
        instructions: {
            en: "Read all questions carefully. Choose the single best answer for each question.",
            gj: "બધા પ્રશ્નો કાળજીપૂર્વક વાંચો. દરેક પ્રશ્ન માટે સૌથી યોગ્ય ઉત્તર પસંદ કરો."
        },
        sections: [
            {
                name: "Section A - SCQ",
                type: "SCQ",
                instructions: "Multiple choice questions with single correct option.",
                totalQuestions: 5,
                maxQuestions: 5,
                questions: questionIds.map(id => ({ questionId: id })),
                markingScheme: { correct: 4, incorrect: -1 }
            }
        ]
    });

    console.log(`Mock Test Created Successfully! ID: ${newTest._id}`);
    process.exit(0);
}

seed();
