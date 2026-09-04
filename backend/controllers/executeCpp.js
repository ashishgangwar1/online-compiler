const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(process.cwd(), "temp", "outputs");

fs.mkdirSync(outputPath, { recursive: true });

const COMPILE_TIMEOUT = 5000;
const EXECUTION_TIMEOUT = 3000;

const executeCpp = (filePath, inputFilePath) => {
    const jobId = path.basename(filePath).split(".")[0];
    const outputFilePath = path.join(outputPath, `${jobId}.exe`);

    return new Promise((resolve, reject) => {

        // -------------------------
        // Compilation
        // -------------------------

        const compile = spawn("g++", [
            filePath,
            "-o",
            outputFilePath
        ]);

        let compileError = "";
        let compileTimedOut = false;

        const compileTimer = setTimeout(() => {
            compileTimedOut = true;
            compile.kill("SIGKILL");
        }, COMPILE_TIMEOUT);

        compile.stderr.on("data", (data) => {
            compileError += data.toString();
        });

        compile.on("error", (error) => {
            clearTimeout(compileTimer);

            reject({
                type: "compile_error",
                error: "Compilation spawn error",
                stderr: error.message
            });
        });

        compile.on("close", (code) => {
            clearTimeout(compileTimer);

            if (compileTimedOut) {
                return reject({
                    type: "timeout",
                    error: "Compilation timed out",
                    stderr: compileError
                });
            }

            if (code !== 0) {
                const sanitizedError = sanitizeCompilerError(compileError,filePath);
                return reject({
                    type: "compile_error",
                    error: "Compilation failed",
                    stderr: sanitizedError
                });
            }

            // -------------------------
            // Execution
            // -------------------------

            const run = spawn(outputFilePath, [], {
                cwd: outputPath,
                shell: false
            });

            let stdout = "";
            let stderr = "";
            let executionTimedOut = false;

            const executionTimer = setTimeout(() => {
                executionTimedOut = true;
                run.kill("SIGKILL");
            }, EXECUTION_TIMEOUT);

            if (inputFilePath) {
                const inputStream = fs.createReadStream(inputFilePath);

                inputStream.on("error", (error) => {
                    run.kill("SIGKILL");
                    clearTimeout(executionTimer);

                    reject({
                        type: "runtime_error",
                        error: "Could not read input file",
                        stderr: error.message
                    });
                });

                inputStream.pipe(run.stdin);
            } else {
                run.stdin.end();
            }

            run.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            run.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            run.on("error", (error) => {
                clearTimeout(executionTimer);

                reject({
                    type: "runtime_error",
                    error: "Runtime spawn error",
                    stderr: error.message
                });
            });

            run.on("close", (code) => {
                clearTimeout(executionTimer);

                if (executionTimedOut) {
                    return reject({
                        type: "timeout",
                        error: "Execution timed out",
                        stderr
                    });
                }

                if (code !== 0) {
                    return reject({
                        type: "runtime_error",
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