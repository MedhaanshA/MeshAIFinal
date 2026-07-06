
# mcp_mail_server.py
import sys
import time
from functools import wraps
from google import genai
from mcp.server.fastmcp import FastMCP

# Initialize the Mail MCP Server
mcp = FastMCP("Enterprise Mail Server", port=8002)
client = genai.Client()

def log(message: str):
    """Log to stderr since stdout is reserved for JSON-RPC transport."""
    sys.stderr.write(f"[Mail Server] {message}\n")
    sys.stderr.flush()

def retry_on_429(max_retries=3, initial_wait=4):
    """Micro-retry decorator to handle rate limits locally on this server."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            wait_time = initial_wait
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                        log(f"Rate limit hit. Waiting {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                        time.sleep(wait_time)
                        wait_time *= 2
                    else:
                        raise e
            return func(*args, **kwargs)
        return wrapper
    return decorator

@mcp.tool()
@retry_on_429()
def draft_and_stage_email(instruction: str, to_email: str) -> str:
    """
    Drafts a professional business email based on instructions and stages it for sending.
    """
    log(f"Drafting email for: {to_email}")
    prompt = f"Write a professional corporate email based on this directive: {instruction}"
    
    # Direct model invocation shifted to gemini-2.5-flash-lite to ensure compatibility and bypass 429 limits
    response = client.models.generate_content(
        model='gemini-2.5-flash-lite',
        contents=prompt,
    )
    return response.text

if __name__ == "__main__":
    log("Starting MCP Mail Server via SSE on port 8002...")
    mcp.run(transport="sse")

