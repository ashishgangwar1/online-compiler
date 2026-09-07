require("dotenv").config();

const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const fs = require("fs");

const Job = require("../models/Job");
const executeCpp = require("../controllers/executeCpp");

const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD
};

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Worker connected to MongoDB");
    } catch (error) {
        console.error("Worker MongoDB connection failed:", error);
        process.exit(1);
    }
}

function deleteFile(filePath) {
    if (!filePath) return;

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error("Could not delete file:", filePath);
    }
}

const worker = new Worker(
    "compileQueue",

    async (job) => {
        const { jobId } = job.data;

        console.log("Processing job:", jobId);

        const dbJob = await Job.findById(jobId);

        if (!dbJob) {
            throw new Error("Job not found");
        }

        try {
            dbJob.status = "running";
            dbJob.startedAt = new Date();
            await dbJob.save();

            if (dbJob.language !== "cpp") {
                throw new Error(`Unsupported language: ${dbJob.language}`);
            }

            const output = await executeCpp(
                dbJob.filePath,
                dbJob.inputFilePath
            );

            dbJob.status = "success";
            dbJob.output = output;
            dbJob.completedAt = new Date();

            await dbJob.save();

            console.log("Job completed:", jobId);

            return output;

        }catch (error) {

            if (error.type === "timeout") {
                dbJob.status = "timeout";
            } else {
                dbJob.status = "error";
            }

            dbJob.error =
                error.stderr ||
                error.error ||
                error.message ||
                "Execution failed";

            dbJob.completedAt = new Date();

            await dbJob.save();

            console.log("Job failed:", jobId);

            throw error;

        }finally {

            deleteFile(dbJob.inputFilePath);
        }
    },

    {
        connection,
        concurrency: 5
    }
);

worker.on("completed", (job) => {
    console.log(`BullMQ job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
    console.error(
        `BullMQ job ${job?.id} failed:`,
        error.message
    );
});

connectDB();

console.log("Compiler worker started...");