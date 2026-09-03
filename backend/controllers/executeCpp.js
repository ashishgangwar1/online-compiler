const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(process.cwd(), "temp", "outputs");

const executeCpp = (filePath, inputFilePath) => {
    const jobId = path.basename(filePath).split(".")[0];
    const outputFilePath = path.join(outputPath, `${jobId}.exe`);

    return new Promise((resolve, reject) => {
        const compile = spawn("g++", [
            filePath,
            "-o",
            outputFilePath
        ]);

        let compileError = "";

        compile.stderr.on("data", (data) => {
            compileError += data.toString();
        });

        compile.on("error", (error) => {
            reject({
                error: "Compilation spawn error",
                stderr: error.message
            });
        });

        compile.on("close", (code) => {
            if (code !== 0) {
                return reject({
                    error: "Compilation failed",
                    stderr: compileError
                });
            }

            const run = spawn(outputFilePath, [], {
                cwd: outputPath,
                shell: false
            });

            let stdout = "";
            let stderr = "";

            if (inputFilePath) {
                const inputStream = fs.createReadStream(inputFilePath);
                inputStream.pipe(run.stdin);
            }

            run.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            run.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            run.on("error", (error) => {
                reject({
                    error: "Runtime spawn error",
                    stderr: error.message
                });
            });

            run.on("close", (code) => {
                if (code !== 0) {
                    return reject({
                        error: "Runtime error",
                        stderr
                    });
                }

                resolve(stdout);
            });
        });
    });
};

module.exports = executeCpp;