const { exec } = require("child_process");

function killProcessTree(pid) {
    if (!pid) return;

    if (process.platform === "win32") {
        exec(`taskkill /pid ${pid} /T /F`, (error) => {
            if (error) {
                console.error(`Failed to kill process tree ${pid}:`, error.message);
            }
        });
    } else {
        try {
            process.kill(-pid, "SIGKILL");
        } catch (error) {
            console.error(`Failed to kill process tree ${pid}:`, error.message);
        }
    }
}

module.exports = killProcessTree;