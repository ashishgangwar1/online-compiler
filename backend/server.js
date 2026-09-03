const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

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
        console.error("MongoDB connection failed:", error.message);
    });

app.get("/", (req, res) => {
    res.send("Online Compiler Backend");
});

const Job = require("./models/Job");

app.use(express.json());

app.post("/jobs", async (req, res) => {
    try {
        const { language, code, input } = req.body;

        const job = await Job.create({
            language,
            code,
            input
        });

        res.status(201).json({
            jobId: job._id
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});