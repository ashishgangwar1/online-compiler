# Online Compiler



A web-based C++ compiler that allows users to write, compile, and execute C++ programs directly from the browser.



The application uses an asynchronous job-processing architecture so that compilation and execution are handled by background workers instead of blocking the API request.



### Features



\- Write and edit C++ code in the browser

\- Monaco Editor integration

\- Provide custom program input

\- Compile and execute C++ programs

\- Asynchronous job processing using BullMQ

\- Redis-backed job queue

\- MongoDB job status and result storage

\- Compilation error handling

\- Runtime error handling

\- Compilation and execution timeouts

\- Process-tree cleanup for timed-out programs

\- Temporary file cleanup

\- Input and code size validation

\- Duplicate execution prevention in the frontend

\- Keyboard shortcut: `Ctrl + Enter`



### Architecture



&#x20;                   ┌──────────────────┐

&#x20;                   │  React Frontend  │

&#x20;                   │  Monaco Editor   │

&#x20;                   └────────┬─────────┘

&#x20;                            │

&#x20;                            │ HTTP

&#x20;                            ▼

&#x20;                   ┌──────────────────┐

&#x20;                   │ Express Backend  │

&#x20;                   │                  │

&#x20;                   │ POST /jobs       │

&#x20;                   │ GET /status/:id  │

&#x20;                   └───────┬──────────┘

&#x20;                           │

&#x20;             ┌─────────────┴─────────────┐

&#x20;             │                           │

&#x20;             ▼                           ▼

&#x20;      ┌──────────────┐           ┌──────────────┐

&#x20;      │   MongoDB    │           │ Redis/BullMQ │

&#x20;      │              │           │    Queue     │

&#x20;      │ Job records  │           │              │

&#x20;      └──────────────┘           └──────┬───────┘

&#x20;                                        │

&#x20;                                        ▼

&#x20;                               ┌──────────────────┐

&#x20;                               │ Compiler Worker  │

&#x20;                               │                  │

&#x20;                               │ BullMQ Worker    │

&#x20;                               │ Concurrency: 5   │

&#x20;                               └────────┬─────────┘

&#x20;                                        │

&#x20;                                        ▼

&#x20;                               ┌──────────────────┐

&#x20;                               │   C++ Compiler   │

&#x20;                               │      g++         │

&#x20;                               └──────────────────┘





### How It Works

1. The user writes C++ code and optionally provides input.
2. The frontend sends the code to POST /jobs.
3. The backend creates a job document in MongoDB.
4. The source code and input are temporarily written to files.
5. The job is added to the BullMQ queue.
6. The API immediately returns a jobId.
7. A background worker picks up the job.
8. The worker compiles the C++ source using g++.
9. If compilation succeeds, the generated executable is run.
10. Program input is provided through stdin.
11. Output and errors are stored in the MongoDB job document.
12. The frontend polls /status/:id until the job finishes.
13. Temporary source and executable files are removed.



### Tech Stack

#### Frontend

* React
* Vite
* Monaco Editor
* CSS

#### Backend

* Node.js
* Express
* MongoDB
* Mongoose
* BullMQ
* Redis
* C++ / g++
* 

### Project Structure



Online-Compiler/

│

├── backend/

│   ├── controllers/

│   │   └── executeCpp.js

│   │

│   ├── models/

│   │   └── Job.js

│   │

│   ├── queues/

│   │   └── compileQueue.js

│   │

│   ├── utils/

│   │   └── killProcess.js

│   │

│   ├── workers/

│   │   └── compileWorker.js

│   │

│   ├── server.js

│   ├── package.json

│   └── .gitignore

│

├── frontend/

│   ├── src/

│   │   ├── App.jsx

│   │   ├── App.css

│   │   └── main.jsx

│   │

│   ├── package.json

│   └── .gitignore

│

└── README.md



### API

#### Create Compilation Job



POST /jobs



##### Request body:

{

&#x20; "language": "cpp",

&#x20; "code": "#include <iostream>\\nint main() { std::cout << \\"Hello\\"; }",

&#x20; "input": ""

}

##### Response:

{

&#x20; "jobId": "...",

&#x20; "status": "pending"

}



#### Check Job Status



GET /status/:id



##### Example response:

{

&#x20; "jobId": "...",

&#x20; "status": "success",

&#x20; "output": "Hello"

}



##### Possible job states:



* pending
* running
* success
* error
* timeout





#### Running Locally

##### Prerequisites



Make sure the following are installed:



* Node.js
* MongoDB
* Redis
* g++ / MinGW



##### Backend

cd backend

npm install



###### Create a .env file:

MONGO\_URI=your\_mongodb\_connection\_string



REDIS\_HOST=your\_redis\_host

REDIS\_PORT=your\_redis\_port

REDIS\_USERNAME=your\_redis\_username

REDIS\_PASSWORD=your\_redis\_password



###### Start the backend:

node server.js



###### In another terminal, start the compiler worker:

cd backend

node workers/compileWorker.js



##### Frontend



cd frontend

npm install

npm run dev



The frontend will provide the local development URL in the terminal.



###### Security and Resource Handling



The backend includes several safeguards:



* Maximum request body size
* Maximum C++ source size
* Maximum input size
* Supported-language validation
* Compilation timeout
* Execution timeout
* Process-tree termination on timeout
* Temporary file cleanup
* Compiler error path sanitization



Note: This project executes submitted C++ programs using the host operating system's compiler and process environment. It is intended as a learning/demo project and is not a production-grade secure code sandbox.



### Future Improvements

* Support additional programming languages
* WebSocket-based execution status updates
* Container-based sandboxing
* Stronger CPU and memory limits
* Rate limiting
* Authentication
* Better execution isolation
* Production deployment



### License



This project is intended for educational and portfolio purposes.

