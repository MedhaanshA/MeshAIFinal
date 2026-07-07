# Mesh AI: Enterprise Agentic Console

Mesh AI is an advanced, multi-agent operational console designed to automate complex corporate workflows, visual data analysis, and competitive intelligence generation. By combining multi-modal document reasoning, visualization layers, and agent-to-agent communication, it transforms unstructured corporate data into immediate strategic value.

## Core Architecture

Mesh AI utilizes a highly decoupled, service-oriented multi-agent architecture:

* **Frontend Interface:** Built with Next.js (App Router), React, and Tailwind CSS. It features a sleek glassmorphic command console, interactive graphs, real-time file analyzers, and customizable user profile state configuration.
* **API Gateway Backend:** Built with FastAPI (`api_gateway.py`), acting as the orchestrator and proxy between the frontend UI, local agent skills, and the primary model workflows.
* **Orchestration Layer & ADK 2.0:** Powered by the official `google-genai` SDK (`main_agent.py`) using autonomous model execution loops, chat histories, manual schema tools, and strict token/turn budget configurations.
* **Local Agent Skills:** Decoupled functional routines (`agent_skills.py`) executing PDF data extraction, Matplotlib graphing, and pptx presentation compilation.
* **FastMCP Servers:** Two standalone Model Context Protocol (MCP) microservices:
    * **Search/Intel Server (Port 8001):** Executes multi-layered web searches (DuckDuckGo + Wikipedia REST API + structured fallback matrix) for live competitive market intelligence.
    * **Mail Server (Port 8002):** Automatically drafts, formats, and stages context-aware corporate emails.

---

## Local Evaluation Structure

The Mesh AI project is designed for seamless, friction-free local verification:

* **Decoupled Stack:** The frontend dashboard connects transparently to the backend gateway on `http://localhost:8000`. 
* **Secure & Isolated Runtime:** The Python microservices host all secure operations, local file systems, and Gemini SDK connections, keeping all credentials secure and isolated on the running machine without requiring complex cloud permissions.

---

## Local Setup Instructions

Follow these steps to initialize your environments and start both the Frontend Console and the Backend Microservices:

### 1. Prerequisites
Ensure you have the following installed on your machine:
* Python 3.10+ and `pip`
* Node.js (v18+) and `npm`

### 2. Frontend Environment Setup
Before running the user interface, you must restore the missing dependencies locally:
1. Open a terminal window and navigate to your frontend directory:
   ```bash
   cd enterprise-ai-dashboard
   ```
2. Install the necessary frontend packages:
   ```bash
   npm install
   ```
3. Start the local frontend development server:
   ```bash
   npm run dev
   ```
Once started, your interface will be active on http://localhost:3000.

### 3. Backend Environment Setup
Open a separate terminal window, navigate to the project root directory, and set up your Python microservices:

Install the backend libraries:
```bash
pip install -r requirements.txt
```
Configure your credentials securely inside the startup script:

1. Open the run_app.bat file in your text editor.
2. Locate the environment line: set GEMINI_API_KEY="Your actual API KEY here"
3. Replace "Your actual API KEY here" with your actual secure Google AI Studio API Key and save the file.

Launch all backend servers simultaneously by double-clicking the script or running:
```bash
.\run_app.bat
```
With both the frontend running on port 3000 and your backend batch cluster running on port 8000, open Chrome and begin interacting with your multi-agent console!
