const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Job = require("./models/Job");
const compileQueue = require("./queues/compileQueue");
const cors = require("cors");

const app = express();

app.use(cors());

app.use(express.json({
    limit: "100kb"
}));

const PORT = 5000;

// -------------------------
// MongoDB Connection
// -------------------------

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:");
        console.error(error);
    });

// -------------------------
// Health Check
// -------------------------

app.get("/", (req, res) => {
    res.send("Online Compiler Backend");
});

// -------------------------
// Create Compilation Job
// -------------------------

app.post("/jobs", async (req, res) => {
    try {
        const { language, code, input = "" } = req.body;

        // Validate required fields
        if (!language || !code) {
            return res.status(400).json({
                error: "Language and code are required"
            });
        }

        // Validate language
        if (language !== "cpp") {
            return res.status(400).json({
                error: "Unsupported language"
            });
        }

        // Validate data types
        if (typeof code !== "string") {
            return res.status(400).json({
                error: "Code must be a string"
            });
        }

        if (typeof input !== "string") {
            return res.status(400).json({
                error: "Input must be a string"
            });
        }

        // -------------------------
        // Request Size Limits
        // -------------------------

        const MAX_CODE_SIZE = 50 * 1024;   // 50 KB
        const MAX_INPUT_SIZE = 10 * 1024;  // 10 KB

        if (Buffer.byteLength(code, "utf8") > MAX_CODE_SIZE) {
            return res.status(413).json({
                error: "Code is too large"
            });
        }

        if (Buffer.byteLength(input, "utf8") > MAX_INPUT_SIZE) {
            return res.status(413).json({
                error: "Input is too large"
            });
        }

        // -------------------------
        // Create Job in MongoDB
        // -------------------------

        const dbJob = await Job.create({
            language,
            code,
            input,
            status: "pending"
        });

        const jobId = dbJob._id.toString();

        // -------------------------
        // Create Temp Directory
        // -------------------------

        const tempPath = path.join(
            process.cwd(),
            "temp"
        );

        fs.mkdirSync(tempPath, {
            recursive: true
        });

        // -------------------------
        // Create Source File
        // -------------------------

        const filePath = path.join(
            tempPath,
            `${jobId}.cpp`
        );

        fs.writeFileSync(filePath, code);

        // -------------------------
        // Create Input File
        // -------------------------

        let inputFilePath = "";

        if (input) {
            inputFilePath = path.join(
                tempPath,
                `${jobId}.txt`
            );

            fs.writeFileSync(
                inputFilePath,
                input
            );
        }

        // -------------------------
        // Save File Paths
        // -------------------------

        dbJob.filePath = filePath;
        dbJob.inputFilePath = inputFilePath;

        await dbJob.save();

        // -------------------------
        // Add Job to BullMQ
        // -------------------------

        await compileQueue.add("compile", {
            jobId
        });

        console.log(
            "Job added to queue:",
            jobId
        );

        // -------------------------
        // Return Immediately
        // -------------------------

        return res.status(202).json({
            jobId,
            status: "pending"
        });

    } catch (error) {
        console.error(
            "Failed to create job:",
            error
        );

        return res.status(500).json({
            error: "Failed to create job"
        });
    }
});

// -------------------------
// Get Job Status
// -------------------------

app.get("/status/:id", async (req, res) => {
    try {
        const job = await Job.findById(
            req.params.id
        );

        if (!job) {
            return res.status(404).json({
                error: "Job not found"
            });
        }

        return res.status(200).json({
            jobId: job._id,
            status: job.status,
            output: job.output,
            error: job.error
        });

    } catch (error) {
        console.error(
            "Failed to get job status:",
            error
        );

        return res.status(500).json({
            error: "Failed to get job status"
        });
    }
});

// -------------------------
// Express Error Handler
// -------------------------

app.use((err, req, res, next) => {

    if (err.type === "entity.too.large") {
        return res.status(413).json({
            error: "Request body too large"
        });
    }

    console.error(
        "Unhandled server error:",
        err
    );

    return res.status(500).json({
        error: "Internal server error"
    });
});