import { useState } from "react";

function App() {
    const [code, setCode] = useState(`#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;

    cout << a + b;

    return 0;
}`);

    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [status, setStatus] = useState("");

    const runCode = async () => {
        try {
            setStatus("Submitting...");
            setOutput("");

            const response = await fetch("http://localhost:5000/jobs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    language: "cpp",
                    code,
                    input
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit job");
            }

            const jobId = data.jobId;

            setStatus("Queued");

            // Poll every 500ms
            const checkStatus = async () => {
                try {
                    const statusResponse = await fetch(
                        `http://localhost:5000/status/${jobId}`
                    );

                    const statusData = await statusResponse.json();

                    if (!statusResponse.ok) {
                        throw new Error(
                            statusData.error || "Failed to get job status"
                        );
                    }

                    if (
                        statusData.status === "pending" ||
                        statusData.status === "running"
                    ) {
                        setStatus(statusData.status);

                        setTimeout(checkStatus, 500);
                        return;
                    }

                    if (statusData.status === "success") {
                        setStatus("Success");
                        setOutput(statusData.output);
                        return;
                    }

                    if (statusData.status === "timeout") {
                        setStatus("Timeout");
                        setOutput(statusData.error);
                        return;
                    }

                    if (statusData.status === "error") {
                        setStatus("Error");
                        setOutput(statusData.error);
                        return;
                    }

                    setStatus("Unknown");
                    setOutput("Unknown job status");

                } catch (error) {
                    console.error(error);
                    setStatus("Error");
                    setOutput(error.message);
                }
            };

            setTimeout(checkStatus, 500);

        } catch (error) {
            console.error(error);
            setStatus("Error");
            setOutput(error.message);
        }
    };

    return (
        <div>
            <h1>Online C++ Compiler</h1>

            <select defaultValue="cpp">
                <option value="cpp">C++</option>
            </select>

            <br /><br />

            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows="20"
                cols="80"
            />

            <br /><br />

            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Input"
                rows="5"
                cols="80"
            />

            <br /><br />

            <button onClick={runCode}>Run Code</button>

            <h3>Status</h3>
            <p>{status || "Ready"}</p>

            <h3>Output</h3>
            <pre>{output}</pre>
        </div>
    );
}

export default App;