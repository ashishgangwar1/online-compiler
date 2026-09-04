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

const PORT = 5000;

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

app.get("/", (req, res) => {
    res.send("Online Compiler Backend");
});

// const Job = require("./models/Job");

app.use(express.json());

app.post("/jobs", async (req, res) => {
    try {
        const { language, code, input = "" } = req.body;

        if (!language || !code) {
            return res.status(400).json({
                error: "Language and code are required"
            });
        }

        // Create job in MongoDB
        const dbJob = await Job.create({
            language,
            code,
            input,
            status: "pending"
        });

        const jobId = dbJob._id.toString();

        // Create temp directory
        const tempPath = path.join(process.cwd(), "temp");
        fs.mkdirSync(tempPath, { recursive: true });

        // Create source file
        const filePath = path.join(
            tempPath,
            `${jobId}.cpp`
        );

        fs.writeFileSync(filePath, code);

        // Create input file only if input exists
        let inputFilePath = "";

        if (input) {
            inputFilePath = path.join(
                tempPath,
                `${jobId}.txt`
            );

            fs.writeFileSync(inputFilePath, input);
        }

        // Save file paths in MongoDB
        dbJob.filePath = filePath;
        dbJob.inputFilePath = inputFilePath;

        await dbJob.save();

        // Add job to BullMQ
        await compileQueue.add("compile", {
            jobId
        });

        console.log("Job added to queue:", jobId);

        // Return immediately
        return res.status(202).json({
            jobId,
            status: "pending"
        });

    } catch (error) {
        console.error("Failed to create job:", error);

        return res.status(500).json({
            error: "Failed to create job"
        });
    }
});

app.get("/status/:id", async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

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
        console.error("Failed to get job status:", error);

        return res.status(500).json({
            error: "Failed to get job status"
        });
    }
});