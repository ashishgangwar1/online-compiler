const { Queue } = require("bullmq");

const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD
};

const compileQueue = new Queue("compileQueue", {
    connection
});

module.exports = compileQueue;