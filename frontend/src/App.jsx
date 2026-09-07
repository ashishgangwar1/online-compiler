import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";
import "./App.css";
const API_URL = import.meta.env.VITE_API_URL;

const defaultCode = `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;

    cout << a + b;

    return 0;
}`;

function App() {
    const [code, setCode] = useState(defaultCode);

    const resetCode = () => {
        setCode(defaultCode);
        setInput("");
        setOutput("");
        setStatus("Ready");
    };

    const clearOutput = () => {
        setOutput("");
        if (!isRunning) setStatus("Ready");
    };

    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [status, setStatus] = useState("Ready");
    const [isRunning, setIsRunning] = useState(false);

    const runCode = async () => {
        try {
            setIsRunning(true);
            setStatus("Submitting...");
            setOutput("");

            const response = await fetch(`${API_URL}/jobs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    language: "cpp",
                    code,
                    input,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit job");
            }

            const jobId = data.jobId;

            setStatus("Queued");

            const checkStatus = async () => {
                try {
                    const statusResponse = await fetch(`${API_URL}/status/${jobId}`);

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
                        setStatus(
                            statusData.status === "pending"
                                ? "Queued"
                                : "Running"
                        );

                        setTimeout(checkStatus, 500);
                        return;
                    }

                    if (statusData.status === "success") {
                        setStatus("Success");
                        setOutput(statusData.output);
                        setIsRunning(false);
                        return;
                    }

                    if (statusData.status === "timeout") {
                        setStatus("Timeout");
                        setOutput(statusData.error);
                        setIsRunning(false);
                        return;
                    }

                    if (statusData.status === "error") {
                        setStatus("Error");
                        setOutput(statusData.error);
                        setIsRunning(false);
                        return;
                    }

                    setStatus("Unknown");
                    setOutput("Unknown job status");
                    setIsRunning(false);
                } catch (error) {
                    console.error(error);
                    setStatus("Error");
                    setOutput(error.message);
                    setIsRunning(false);
                }
            };

            setTimeout(checkStatus, 500);
        } catch (error) {
            console.error(error);
            setStatus("Error");
            setOutput(error.message);
            setIsRunning(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.ctrlKey && event.key === "Enter") {
                event.preventDefault();

                if (!isRunning) {
                    runCode();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isRunning, code, input]);

    return (
        <div className="app">
            <header className="header">
                <div>
                    <h1>Online Compiler</h1>
                    <p>Compile and run your C++ programs</p>
                </div>

                <div className="language">
                    <label htmlFor="language">Language</label>
                    <select id="language" defaultValue="cpp">
                        <option value="cpp">C++</option>
                    </select>
                </div>
            </header>

            <main className="compiler">
                <section className="panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <span>Code</span>
                            <span className="shortcut-hint">Ctrl + Enter to run</span>
                        </div>

                        <div className="code-actions">
                            <button
                                className="secondary-button"
                                onClick={resetCode}
                                disabled={isRunning}
                            >
                                Reset
                            </button>

                            <button
                                className="run-button"
                                onClick={runCode}
                                disabled={isRunning}
                            >
                                {isRunning ? status : "▶ Run Code"}
                            </button>
                        </div>
                    </div>

                    <Editor
                        height="480px"
                        language="cpp"
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => setCode(value || "")}
                        options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            automaticLayout: true,
                            wordWrap: "off",
                            scrollBeyondLastLine: false,
                            tabSize: 4,
                            insertSpaces: true,
                            padding: {
                                top: 16
                            }
                        }}
                    />
                </section>

                <section className="bottom-section">
                    <div className="panel input-panel">
                        <div className="panel-header">
                            <span>Input</span>
                        </div>

                        <textarea
                            className="input-editor"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Enter program input..."
                            spellCheck="false"
                            disabled={isRunning}
                        />
                    </div>

                    <div className="panel output-panel">
                        <div className="panel-header">
                            <span>Output</span>

                            <div className="output-actions">
                                <span className={`status ${status.toLowerCase()}`}>
                                    {isRunning && <span className="status-spinner"></span>}
                                    {status}
                                </span>

                                <button
                                    className="secondary-button"
                                    onClick={clearOutput}
                                    disabled={!output || isRunning}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <pre className="output">
                            {output || "Program output will appear here..."}
                        </pre>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;