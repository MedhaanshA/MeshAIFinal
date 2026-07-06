@echo off
title Running Enterprise AI Agent System...

:: 1. SET YOUR API KEY DIRECTLY HERE
set GEMINI_API_KEY="Your actual API KEY here"
echo 📦 Verifying Python dependencies for your PC...
python -m pip install -q duckduckgo_search beautifulsoup4 requests fastapi uvicorn google-genai mcp python-pptx matplotlib

echo 🚀 Launching Search MCP Server (Auto-Intel)...
start /b cmd /c "set GEMINI_API_KEY=%GEMINI_API_KEY% && python mcp_search_server.py"

echo 🚀 Launching Mail MCP Server (Auto-Mail)...
start /b cmd /c "set GEMINI_API_KEY=%GEMINI_API_KEY% && python mcp_mail_server.py"

echo 🚀 Launching API Gateway...
start /b python api_gateway.py

echo 🚀 Launching Frontend UI Dashboard...
cd enterprise-ai-dashboard
start /b npm run dev

echo 🔥 System is fully synchronized! Open http://localhost:3000 in Chrome.
pause