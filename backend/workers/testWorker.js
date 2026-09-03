require("dotenv").config();

const { Worker } = require("bullmq");

const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD
};

const worker = new Worker(
    "compileQueue",
    async (job) => {
        console.log("Job received:", job.id);
        console.log("Job data:", job.data);

        return {
            message: "Job processed successfully"
        };
    },
    {
        connection
    }
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
    console.log(`Job ${job?.id} failed:`, error.message);
});

console.log("Worker is waiting for jobs...");