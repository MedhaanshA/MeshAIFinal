# api_gateway.py
import os
import sys
import json
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from google import genai

from agent_skills import process_vision_image, process_document_file, generate_slide_deck, generate_expense_chart
from main_agent import run_agent_query, generate_mail_via_mcp

app = FastAPI(title="Enterprise AI Agent Gateway")
genai_client = genai.Client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IntelRequest(BaseModel):
    target: str

class MailRequest(BaseModel):
    instruction: str
    to_email: str = "team@example.com" 

# --- CONTACTS & TEAMS SCHEMA ---
class Contact(BaseModel):
    id: str
    name: str
    email: str

class Team(BaseModel):
    id: str
    team_name: str
    member_ids: List[str]

class NewContact(BaseModel):
    name: str
    email: str

class NewTeam(BaseModel):
    team_name: str
    member_ids: List[str]

class MemorySaveRequest(BaseModel):
    query: str
    response: str

# --- MOCK MEMORY DATABASE ---
db_contacts = [
    {"id": "c1", "name": "Sarah Johnson", "email": "sarah.j@company.com"},
    {"id": "c2", "name": "Michael Chen", "email": "m.chen@company.com"},
    {"id": "c3", "name": "Alex Smith", "email": "alex.s@company.com"}
]

db_teams = [
    {"id": "t1", "team_name": "Executive Leadership", "member_ids": ["c1", "c2"]},
    {"id": "t2", "team_name": "Core Engineering", "member_ids": ["c2", "c3"]}
]


FORBIDDEN_TOPICS = ["phishing", "malware", "illicit", "fraud", "scam"]

def execute_input_guardrail(text: str) -> bool:
    sanitized_input = text.lower()
    for phrase in FORBIDDEN_TOPICS:
        if phrase in sanitized_input:
            return False
    return True

# --- CONTACTS & TEAMS ENDPOINTS ---
@app.get("/api/contacts")
async def get_contacts():
    return db_contacts

@app.get("/api/teams")
async def get_teams():
    return db_teams

@app.post("/api/contacts")
async def create_contact(contact: NewContact):
    new_id = f"c{len(db_contacts) + 1}"
    new_contact = {"id": new_id, "name": contact.name, "email": contact.email}
    db_contacts.append(new_contact)
    return new_contact

@app.post("/api/teams")
async def create_team(team: NewTeam):
    new_id = f"t{len(db_teams) + 1}"
    new_team = {"id": new_id, "team_name": team.team_name, "member_ids": team.member_ids}
    db_teams.append(new_team)
    return new_team


# =====================================================================
# UNTOUCHED: AUTO-INTEL MODULE
# =====================================================================
@app.post("/api/intel")
async def get_intel(req: IntelRequest):
    if not execute_input_guardrail(req.target):
        return {
            "summary": "The request was actively blocked due to security policies.",
            "opportunities": [],
            "risks": []
        }

    try:
        # Pass the plain-text query to your main multi-agent orchestrator
        agent_response_str = await run_agent_query(req.target)
        
        # Clean up any potential markdown code blocks returned by the model
        clean_str = agent_response_str.replace("```json", "").replace("```", "").strip()
        try:
            report_data = json.loads(clean_str)
        except Exception as json_err:
            sys.stderr.write(f"[API Gateway Error] JSON decode failed for target '{req.target}': {str(json_err)}\n")
            sys.stderr.flush()
            report_data = {
                "summary": clean_str,
                "opportunities": [],
                "risks": [f"JSON Parse Error: {str(json_err)}"]
            }
        
        return {
            "summary": report_data.get("summary", "No summary generated."),
            "opportunities": report_data.get("opportunities", []),
            "risks": report_data.get("risks", [])
        }
        
    except Exception as e:
        sys.stderr.write(f"[API Gateway Critical Failure] get_intel failed for target '{req.target}': {str(e)}\n")
        sys.stderr.flush()
        return {
            "summary": "Intel Engine Error: A critical system error occurred.",
            "opportunities": [],
            "risks": [str(e)]
        }


# =====================================================================
# MEMORY HISTORY MODULE
# =====================================================================
@app.get("/api/intel/history")
async def get_intel_history():
    """Fetches the persistent chat history for the frontend dropdown."""
    import os
    import json
    
    history_file = "chat_history.json"
    if os.path.exists(history_file):
        try:
            with open(history_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            return {"error": f"Failed to read memory: {str(e)}"}
    
    # Return empty list if no memory exists yet
    return []

@app.delete("/api/intel/history")
async def clear_intel_history():
    """Wipes the persistent chat history."""
    import os
    history_file = "chat_history.json"
    if os.path.exists(history_file):
        try:
            os.remove(history_file)
            return {"status": "success", "message": "Memory cleared."}
        except Exception as e:
            return {"error": f"Failed to clear memory: {str(e)}"}
    return {"status": "success", "message": "Memory already empty."}

@app.post("/api/intel/history")
async def save_intel_history(req: MemorySaveRequest):
    """Selectively saves a specific chat into the agent's memory."""
    import os
    import json
    history_file = "chat_history.json"
    history = []
    
    if os.path.exists(history_file):
        try:
            with open(history_file, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            pass
            
    history.append({"role": "user", "content": req.query})
    history.append({"role": "model", "content": req.response})
    
    try:
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(history[-20:], f, indent=2)
        return {"status": "success"}
    except Exception as e:
        return {"error": f"Failed to save memory: {str(e)}"}


# =====================================================================
# UNTOUCHED: VISION MODULE
# =====================================================================
@app.post("/api/vision")
async def analyze_image(file: UploadFile = File(...)):
    is_pdf = file.content_type == "application/pdf"
    if not (file.content_type.startswith("image/") or is_pdf):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image or PDF document.")
        
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
            
        if is_pdf:
            raw_result = process_document_file(temp_path)
        else:
            raw_result = process_vision_image(temp_path)
        
        clean_str = raw_result.replace("```json", "").replace("```", "").strip()
        
        try:
            vision_data = json.loads(clean_str)
            if isinstance(vision_data, str):
                vision_data = {"summary": vision_data}
        except json.JSONDecodeError:
            vision_data = {"summary": clean_str}
            
        insight_text = str(vision_data.get("insight", ""))
        if "429" in insight_text or "RESOURCE_EXHAUSTED" in insight_text:
            raise HTTPException(
                status_code=429, 
                detail="Upstream AI limit reached. Please wait a moment and try again."
            )

        return {
            "status": "success",
            "summary": vision_data.get("summary", clean_str),
            "key_elements": vision_data.get("key_elements", []),
            "insight": vision_data.get("insight", "No insights extracted.")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

# =====================================================================
# REFACTORED: 2-STEP AUDIO PROCESSING PIPELINE (2.5-FLASH-LITE)
# =====================================================================
def execute_2step_audio_pipeline(file_path: str) -> str:
    """Handles the sequential Transcription -> Summarization network calls"""
    try:
        # STEP 0: Upload local file safely with the explicit MIME type
        print(f"[Audio Pipeline] Uploading {file_path} to Gemini...")
        uploaded_audio = genai_client.files.upload(
            file=file_path, 
            config={'mime_type': 'audio/webm'}
        )
        
        try:
            # STEP 1: Transcription via gemini-2.5-flash-lite
            print("[Audio Pipeline] Step 1: Initiating transcription via 2.5-flash-lite...")
            transcription_prompt = "Transcribe this audio recording into highly accurate, structured text. Output only the transcript."
            
            resp1 = genai_client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=[uploaded_audio, transcription_prompt]
            )
            transcript = resp1.text
            
        finally:
            # Guarantee cloud file deletion immediately after transcription is complete
            try:
                genai_client.files.delete(name=uploaded_audio.name)
                print("[Audio Pipeline] Cloud file deleted securely.")
            except Exception as cleanup_err:
                print(f"Warning: Failed to delete cloud file: {cleanup_err}")

        # STEP 2: Summarization via gemini-2.5-flash-lite (Strict JSON Schema Enforcement)
        print("[Audio Pipeline] Step 2: Generating executive summary from transcript...")
        summary_prompt = (
            "Create a structured executive summary and actionable action items based on the following text transcript:\n\n"
            f"[TRANSCRIPT]\n{transcript}\n\n"
            "CRITICAL: Return ONLY a JSON object with the keys: 'summary' and 'action_items'. The 'action_items' key must be an array of objects, where each object has exactly these four keys:\n"
            "- 'task': The short text description of the action item (e.g., 'Drink a glass of water').\n"
            "- 'priority': 'High', 'Medium', or 'Low'.\n"
            "- 'due_date': The deadline or timeframe.\n"
            "- 'owner': Who is responsible.\n"
            "Do not use alternative keys like 'actionable_item', 'description', or 'title'."
        )
        
        resp2 = genai_client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=[summary_prompt]
        )
        
        return resp2.text

    except Exception as e:
        # Bulletproof Exception Handling: Log error to console without crashing the container
        print(f"Gemini Error: {e}")
        # Return a structured fallback payload so parsers don't fail
        return json.dumps({
            "summary": "Audio processing failed due to an internal AI error or unrecognizable audio blob.",
            "action_items": []
        })

# =====================================================================
# REFACTORED: ROBUST AUDIO ENDPOINTS
# =====================================================================
@app.post("/api/recording/stream")
async def stream_recording(file: UploadFile = File(...)):
    chunk_path = f"temp_live_stream_{file.filename}"
    try:
        # The 'with' context manager automatically and safely closes the file stream when finished
        with open(chunk_path, "wb") as buffer:
            buffer.write(await file.read())
            
        # Pass the fully closed file path to our 2-Step Gemini Pipeline
        raw_result = execute_2step_audio_pipeline(chunk_path)
        
        clean_str = raw_result.replace("```json", "").replace("```", "").strip()
        
        # Prevent JSON Corruption: Ensure the output is strictly a dictionary
        try:
            summary_data = json.loads(clean_str)
            if not isinstance(summary_data, dict):
                summary_data = {"summary": str(summary_data), "action_items": []}
        except json.JSONDecodeError:
            summary_data = {"summary": clean_str, "action_items": []}

        # Explicit Dictionary Return
        return summary_data
        
    except Exception as e:
        print(f"Endpoint Error: {e}")
        # Guaranteed clean dict return even on critical system failure
        return {"summary": f"Failed to process live audio blob: {str(e)}", "action_items": []}
    finally:
        # Clean Lifecycle: File handles are explicitly closed before os.remove() runs
        if os.path.exists(chunk_path): 
            try:
                os.remove(chunk_path)
            except Exception as cleanup_err:
                print(f"Warning: Failed to cleanly delete temp audio chunk: {cleanup_err}")

@app.post("/api/audio/chunk")
async def process_audio_chunk(file: UploadFile = File(...), session_id: str = Form("default_session")):
    chunk_path = f"temp_stream_{session_id}.webm"
    try:
        with open(chunk_path, "ab") as buffer:
            buffer.write(await file.read())
        return {"status": "chunk appended", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to append chunk: {str(e)}")

@app.post("/api/audio/summarize")
async def analyze_audio(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Audio required.")
    
    chunk_path = f"temp_{file.filename}"
    
    try:
        with open(chunk_path, "wb") as buffer:
            buffer.write(await file.read())
            
        raw_result = execute_2step_audio_pipeline(chunk_path)
        
        clean_str = raw_result.replace("```json", "").replace("```", "").strip()
        try:
            summary_data = json.loads(clean_str)
            if not isinstance(summary_data, dict):
                summary_data = {"summary": str(summary_data), "action_items": []}
        except Exception:
            summary_data = {"summary": clean_str, "action_items": []}
            
        return summary_data
            
    except Exception as e:
        print(f"Endpoint Error: {e}")
        return {"summary": f"Audio compilation failed: {str(e)}", "action_items": []}
    finally:
        if os.path.exists(chunk_path): 
            try:
                os.remove(chunk_path)
            except Exception as cleanup_err:
                print(f"Warning: Failed to cleanly delete temp audio chunk: {cleanup_err}")

# =====================================================================
# UNTOUCHED: AUTO-MAIL MODULE
# =====================================================================
@app.post("/api/mail/draft")
async def draft_mail(request: MailRequest):
    if not execute_input_guardrail(request.instruction):
        return {
            "status": "blocked",
            "subject": "Blocked by Guardrails",
            "body": "The requested email content violates internal compliance standards.",
            "recipient": request.to_email
        }

    try:
        raw_result = await generate_mail_via_mcp(
            instruction=request.instruction,
            to_email=request.to_email
        )
        
        clean_str = raw_result.replace("```json", "").replace("```", "").strip()
        draft_result = json.loads(clean_str)
        
        subject = draft_result.get("subject")
        if not subject:
            raise ValueError("MCP Server failed to dynamically generate a context-aware subject line.")
            
        return {
            "status": "success",
            "subject": subject,
            "body": draft_result.get("body", ""),
            "recipient": request.to_email
        }
        
    except Exception as e:
        return {
            "status": "error",
            "subject": "Protocol / Execution Error", 
            "body": f"Backend Error: {str(e)}",
            "recipient": request.to_email
        }


# =====================================================================
# FEATURE 1: PRESENTATION TOOL ENDPOINTS
# =====================================================================
class PresentationRequest(BaseModel):
    prompt: str
    slide_count: int = 5

@app.post("/api/presentation/generate")
async def generate_presentation_endpoint(req: PresentationRequest):
    """Accepts a free-form text prompt and an integer slide count.
    Delegates to generate_slide_deck which uses a strict JSON Gemini call
    before rendering via python-pptx. Returns metadata + per-slide structure.
    """
    try:
        output_file = "presentation.pptx"
        result = generate_slide_deck(
            text=req.prompt,
            slide_count=req.slide_count,
            filename=output_file
        )
        return {
            "status": "success",
            "file": output_file,
            "deck_title": result.get("deck_title", "Presentation"),
            "slide_count": result.get("slide_count", req.slide_count),
            "slides": result.get("slides", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate presentation: {str(e)}")

@app.get("/api/presentation/download")
async def download_presentation_endpoint():
    output_file = "presentation.pptx"
    if not os.path.exists(output_file):
        raise HTTPException(status_code=404, detail="Presentation not generated yet.")
    return FileResponse(
        output_file,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename="presentation.pptx"
    )


# =====================================================================
# FEATURE 3: PYTHON EXPENSE TRACKER ENDPOINTS
# =====================================================================
class ExpenseRequest(BaseModel):
    reason: str
    amount: float

RECORDS_FILE = "records.json"

def get_records():
    if not os.path.exists(RECORDS_FILE):
        return []
    try:
        with open(RECORDS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_records(records):
    try:
        with open(RECORDS_FILE, "w") as f:
            json.dump(records, f, indent=2)
    except Exception as e:
        print(f"Error saving records: {e}")

@app.post("/api/expense")
async def add_expense_endpoint(req: ExpenseRequest):
    try:
        records = get_records()
        records.append({
            "reason": req.reason,
            "amount": req.amount
        })
        save_records(records)
        # Regenerate chart
        generate_expense_chart(records)
        return {"status": "success", "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record transaction: {str(e)}")

@app.get("/api/expense")
async def list_expenses_endpoint():
    try:
        records = get_records()
        # Calculate isolated totals
        credits_sum = sum(abs(r['amount']) for r in records if r['amount'] >= 0)
        debits_sum = sum(abs(r['amount']) for r in records if r['amount'] < 0)
        balance = credits_sum - debits_sum
        absolute_aggregate = sum(abs(r['amount']) for r in records)
        
        # Ensure chart is generated
        generate_expense_chart(records)
        
        return {
            "records": records,
            "credits": credits_sum,
            "debits": debits_sum,
            "balance": balance,
            "absolute_aggregate": absolute_aggregate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve expenses: {str(e)}")

@app.delete("/api/expense")
async def clear_expenses_endpoint():
    try:
        save_records([])
        generate_expense_chart([])
        return {"status": "success", "message": "All entries cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear expenses: {str(e)}")

@app.get("/api/expense/chart")
async def get_expense_chart_endpoint():
    chart_path = os.path.join("enterprise-ai-dashboard", "public", "expense_chart.png")
    if not os.path.exists(chart_path):
        generate_expense_chart([])
    return FileResponse(chart_path, media_type="image/png")


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Enterprise API Gateway on http://localhost:8000")
    uvicorn.run("api_gateway:app", host="0.0.0.0", port=8000, reload=True)


