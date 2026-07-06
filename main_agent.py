# main_agent.py
import sys
import time
import json
import urllib.parse
import requests
from duckduckgo_search import DDGS
from google import genai
from google.genai import types

from mcp import ClientSession
from mcp.client.sse import sse_client

from agent_skills import process_vision_image, process_meeting_audio

client = genai.Client()

def send_with_retry_sync(chat, payload, max_retries=2):
    """Synchronous send_message helper with minimal retries to prevent token waste."""
    backoff = 2
    for attempt in range(max_retries):
        try:
            response = chat.send_message(payload)
            return response
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                sys.stderr.write(f"[⚠️ Rate Limit] Hit 429. Retrying in {backoff}s...\n")
                sys.stderr.flush()
                time.sleep(backoff)
                backoff *= 2
            else:
                raise e
    raise RuntimeError("Engine exhausted due to rate limits.")

def generate_content_with_retry(model: str, contents, config, max_retries=2):
    """Synchronous generate_content helper with minimal retries to prevent token waste."""
    backoff = 2
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
            return response
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                sys.stderr.write(f"[⚠️ Rate Limit] Hit 429. Retrying in {backoff}s...\n")
                sys.stderr.flush()
                time.sleep(backoff)
                backoff *= 2
            else:
                raise e
    raise RuntimeError("Engine exhausted due to rate limits.")

def search_and_scrape_web(query: str) -> str:
    """Searches the web for a query, retrieves snippets, and returns the compiled text.
    Use this tool when you need live market intelligence, competitor data, or academic details.
    """
    # Clean search query terms to strip conversational filler words
    orig_query = query
    query = " ".join([w for w in query.split() if w.lower() not in ["conduct", "a", "competitive", "analysis", "between", "current", "information", "on", "please", "search", "for"]])
    if not query.strip():
        query = orig_query

    if not query.strip():
        return "Search unavailable. Summarize existing knowledge."

    print(f"[Research Agent Local Tool] Executing search for: '{query}'")
    
    # Layer 1: DuckDuckGo search API
    try:
        ddgs = DDGS()
        search_results = list(ddgs.text(query, max_results=2))
        if search_results:
            combined_text = f"--- Search Results (DDG) ---\n\n"
            for res in search_results:
                title = res.get('title', 'No Title')
                link = res.get('href', '')
                snippet = res.get('body', '')
                combined_text += f"Title: {title}\nSource: {link}\nSnippet: {snippet}\n\n"
            if combined_text.strip():
                return combined_text
    except Exception as ddg_err:
        sys.stderr.write(f"[Local Tool Warning] DDG search failed: {str(ddg_err)}\n")
        sys.stderr.flush()

    # Layer 2 Fallback: Wikipedia Search REST API
    try:
        safe_query = urllib.parse.quote(query)
        url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={safe_query}&format=json&utf8=1"
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=6)
        if r.status_code == 200:
            data = r.json()
            search_items = data.get("query", {}).get("search", [])
            if search_items:
                combined_text = f"--- Search Results (Wikipedia Fallback) ---\n\n"
                for item in search_items[:2]:
                    title = item.get("title", "No Title")
                    page_id = item.get("pageid", "")
                    link = f"https://en.wikipedia.org/?curid={page_id}" if page_id else "https://en.wikipedia.org"
                    snippet_raw = item.get("snippet", "")
                    snippet = snippet_raw.replace("<span class=\"searchmatch\">", "").replace("</span>", "").strip()
                    combined_text += f"Title: {title}\nSource: {link}\nSnippet: {snippet}\n\n"
                if combined_text.strip():
                    return combined_text
    except Exception as wiki_err:
        sys.stderr.write(f"[Local Tool Warning] Wikipedia search failed: {str(wiki_err)}\n")
        sys.stderr.flush()

    # Layer 3 Fallback: Returns the mandated tiny 5-word failure string to preserve tokens
    return "Search unavailable. Summarize existing knowledge."

async def run_agent_query(user_prompt: str) -> str:
    print(f"\n[ADK Orchestrator] Initializing Multi-Agent session for query: {user_prompt}")
    try:
        # Restored the manual schema to prevent TaskGroup crashes and control loop iterations
        search_tool_schema = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="search_and_scrape_web",
                    description="Searches the web for a query, retrieves snippets, and returns the compiled text.",
                    parameters=types.Schema(
                        type="OBJECT",
                        properties={
                            "query": types.Schema(type="STRING")
                        },
                        required=["query"]
                    )
                )
            ]
        )
        
        research_config = types.GenerateContentConfig(
            system_instruction=(
                "You are the ResearchAgent. Your role is to perform deep competitive intelligence. "
                "You possess the exclusive 'search_and_scrape_web' tool. Use it to gather comprehensive, "
                "unbiased real-time insights based on the user's prompt. Summarize your findings meticulously. "
                "Be extremely concise. Cut all filler, pleasantries, and fluff. Provide direct data points only."
            ),
            tools=[search_tool_schema], 
            temperature=0.3,
            max_output_tokens=400, # Hard limit: 400 output tokens for research agent
        )
        
        print("[Orchestrator] -> Activating ResearchAgent...")
        # Synchronous client session with manual tool resolution loop
        research_chat = client.chats.create(model='gemini-2.5-flash', config=research_config)
        research_response = send_with_retry_sync(research_chat, user_prompt)
        
        # Hard limit: EXACTLY ONE tool call turn (max_turns = 1) to prevent runaway retry loops
        max_turns = 1  
        current_turn = 0
        
        while research_response.function_calls:
            if current_turn >= max_turns:
                print("[Orchestrator] 🛑 Max search limit (1 turn) reached. Summarizing...")
                forced_responses = [
                    types.Part.from_function_response(
                        name=call.name,
                        response={"result": "Search unavailable. Summarize existing knowledge."}
                    )
                    for call in research_response.function_calls
                ]
                research_response = send_with_retry_sync(research_chat, forced_responses)
                break
            
            current_turn += 1 
            function_responses = [] 
            
            for call in research_response.function_calls:
                if call.name == "search_and_scrape_web":
                    try:
                        query_arg = call.args.get("query")
                        tool_result = search_and_scrape_web(query_arg)
                    except Exception as inner_err:
                        sys.stderr.write(f"[Silent Inner Exception] Tool call error: {str(inner_err)}\n")
                        sys.stderr.flush()
                        tool_result = "Search unavailable. Summarize existing knowledge."
                    
                    function_responses.append(
                        types.Part.from_function_response(
                            name=call.name,
                            response={"result": tool_result}
                        )
                    )
            
            research_response = send_with_retry_sync(
                research_chat,
                function_responses
            )
        
        try:
            raw_research_data = research_response.text
        except ValueError:
            raw_research_data = "Search unavailable. Summarize existing knowledge."
            
        if not raw_research_data:
            raw_research_data = "Search unavailable. Summarize existing knowledge."
        
        writer_config = types.GenerateContentConfig(
            system_instruction=(
                "You are the ComplianceWriterAgent. Your sole responsibility is to ingest raw research reports "
                "and compress them into a structurally flawless JSON payload for the Next.js frontend UI dashboard.\n\n"
                "You MUST output raw JSON matching this schema exactly:\n"
                "{\n"
                "  \"source\": \"Primary URL string or 'Multiple Sources'\",\n"
                "  \"summary\": \"A strict two-sentence executive overview summarizing the key details.\",\n"
                "  \"opportunities\": [\"Actionable item 1\", \"Actionable item 2\", \"Actionable item 3\"]\n"
                "}\n"
                "Be extremely concise. Cut all filler, pleasantries, and fluff. Provide direct data points only."
            ),
            response_mime_type="application/json",
            temperature=0.1,
            max_output_tokens=1000, # Hard limit: 1000 output tokens for final report
        )
        
        print("[Orchestrator] -> Compiling data via ComplianceWriterAgent...")
        final_response = generate_content_with_retry(
            model='gemini-2.5-flash-lite',
            contents=f"Transform this raw intelligence into the required UI schema layout: {raw_research_data}",
            config=writer_config
        )
        
        final_output = final_response.text.strip()
        print("[Orchestrator] ✅ System workflow complete. Returning schema.")
        return final_output

    except Exception as e:
        sys.stderr.write(f"[ADK Orchestrator Error] Critical System Fallback: {str(e)}\n")
        sys.stderr.flush()
        return json.dumps({
            "source": "System Error",
            "summary": "Search unavailable. Summarize existing knowledge.",
            "opportunities": []
        })

async def generate_mail_via_mcp(instruction: str, to_email: str) -> str:
    print(f"\n[Mail Orchestrator] Routing email request strictly to MCP Port 8002...")
    try:
        async with sse_client("http://127.0.0.1:8002/sse") as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                
                enhanced_instruction = (
                    f"Instruction: {instruction}\n\n"
                    "CRITICAL: You MUST output ONLY a raw, valid JSON object. Do NOT wrap in markdown blocks.\n"
                    "You MUST dynamically generate a highly engaging, context-specific subject line based on the email body you write. DO NOT use generic placeholders.\n"
                    "Schema:\n"
                    "{\n"
                    "  \"subject\": \"<context-aware dynamic subject>\",\n"
                    "  \"body\": \"<professional email body>\"\n"
                    "}"
                )
                
                mcp_result = await session.call_tool("draft_and_stage_email", arguments={
                    "instruction": enhanced_instruction,
                    "to_email": to_email
                })
                return str(mcp_result.content[0].text)
                
    except Exception as e:
        sys.stderr.write(f"[Mail Orchestrator Error] Protocol Connection Error: MCP Mail Server on port 8002 is unreachable. ({str(e)})\n")
        sys.stderr.flush()
        raise RuntimeError(f"Protocol Connection Error: MCP Mail Server on port 8002 is unreachable. ({str(e)})")
