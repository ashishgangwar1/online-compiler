const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    language: {
        type: String,
        required: true
    },

    code: {
        type: String,
        required: true
    },

    input: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        default: "pending"
    },

    output: {
        type: String,
        default: ""
    },

    error: {
        type: String,
        default: ""
    },

    filePath: {
        type: String,
        default: ""
    },

    inputFilePath: {
        type: String,
        default: ""
    },

    startedAt: {
        type: Date
    },

    completedAt: {
        type: Date
    }
});

module.exports = mongoose.model("Job", jobSchema);