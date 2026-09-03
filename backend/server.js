const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const Job = require("./models/Job");
const executeCpp = require("./controllers/executeCpp");

const app = express();

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
        const { language, code, input } = req.body;

        const job = await Job.create({
            language,
            code,
            input
        });

        const jobId = job._id.toString();

        const tempPath = path.join(process.cwd(), "temp");
        const sourcePath = path.join(tempPath, `${jobId}.cpp`);
        const inputPath = path.join(tempPath, `${jobId}.txt`);

        fs.mkdirSync(tempPath, { recursive: true });

        fs.writeFileSync(sourcePath, code);

        if (input) {
            fs.writeFileSync(inputPath, input);
        }

        try {
            const output = await executeCpp(
                sourcePath,
                input ? inputPath : null
            );

            job.status = "success";
            job.output = output;
            await job.save();

            res.status(200).json({
                jobId,
                status: "success",
                output
            });
        } catch (error) {
            job.status = "error";
            job.error = error.stderr || error.error || "Execution failed";
            await job.save();

            res.status(200).json({
                jobId,
                status: "error",
                error: job.error
            });
        }
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});