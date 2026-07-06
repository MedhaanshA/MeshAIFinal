"use client";

import { useState, useRef } from "react";
import { Mic, Square, CheckSquare, Loader2, AlertTriangle, UploadCloud, Mail } from "lucide-react";

export default function Meetings({ bridgeToMailTool }: { bridgeToMailTool?: (type: string, data: string) => void }) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // References to handle the browser's native recording stream
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    setError(null);
    setSummary(null);
    try {
      // Request microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio data chunks as they stream in
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When stopped, package the chunks and send to FastAPI
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendAudioToBackend(audioBlob, "live_recording.webm", "/api/recording/stream");
        
        // Terminate the active microphone stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access denied or error:", err);
      setError("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Keep the traditional file upload intact as a fallback
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendAudioToBackend(file, file.name, "/api/audio/summarize");
  };

  const sendAudioToBackend = async (audioBlob: Blob | File, filename: string, endpoint: string) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", audioBlob, filename);

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data);
    } catch (err: any) {
      console.error("Audio API Error:", err);
      // Map all load, timeout, status or fetch errors to the strict user-mandated message
      setError("The server is currently experiencing high load. Please try again in a few moments.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-full space-y-12 pt-8 w-full">
      {error && (
        <div className="w-full bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="text-center space-y-8">
        <h2 className="text-3xl font-bold">
          {loading ? "Processing Audio with Gemini..." : isRecording ? "Recording Live Meeting..." : "Meeting Intelligence"}
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto whitespace-pre-line">
          Capture and analyze your meeting discussions.
          {"\n"}Be patient for this tool, it may take a few minutes.
        </p>

        {/* Live Recording Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            className={`relative p-10 rounded-full transition-all duration-300 flex items-center justify-center
              ${isRecording ? "bg-rose-500/20 text-rose-400 shadow-[0_0_60px_rgba(244,63,94,0.4)] animate-pulse" :
                loading ? "bg-slate-800 text-slate-500" : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:scale-105"}
            `}
          >
            {loading ? <Loader2 className="w-14 h-14 animate-spin" /> :
             isRecording ? <Square className="w-14 h-14 fill-current" /> : <Mic className="w-14 h-14" />}
          </button>
          
          <p className="text-slate-500 font-medium">
            {isRecording ? "Tap to Stop & Summarize" : "Tap to Start Live Recording"}
          </p>
        </div>

        {/* Fallback File Upload */}
        <div className="relative inline-block mt-4 group">
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            disabled={loading || isRecording}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />
          <button disabled={loading || isRecording} className="text-sm text-slate-400 flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50">
             <UploadCloud className="w-4 h-4" /> Or upload existing audio file (.wav, .mp3)
          </button>
        </div>
      </div>

      {summary && (
        <div className="w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl animate-in fade-in zoom-in-95 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-rose-400">Meeting Summary</h3>
            
            <div className="flex items-center gap-3">
              {/* THE NEW INTERCONNECTION BUTTON */}
              {bridgeToMailTool && (
                <button 
                  onClick={() => bridgeToMailTool("meetings", JSON.stringify(summary.action_items))}
                  className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <Mail className="w-4 h-4" /> Email Action Items
                </button>
              )}
            </div>
          </div>
          
          <p className="text-slate-300 mb-8 leading-relaxed whitespace-pre-wrap">{summary.summary}</p>

          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Action Items
          </h4>
          <div className="space-y-4">
            {summary.action_items?.length > 0 ? (
              summary.action_items.map((item: any, i: number) => {
                // Failsafes to handle slight AI JSON hallucination variances
                const isObject = typeof item === 'object' && item !== null;
                const task = isObject ? (item.task || item.description || item.title || "Untitled Task") : item;
                const owner = isObject ? (item.owner || item.assignee) : null;
                const dueDate = isObject ? (item.due_date || item.deadline) : null;
                const priority = isObject ? (item.priority || item.urgency) : null;

                return (
                  <label key={i} className="flex items-start gap-4 p-5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors w-full overflow-hidden">
                    <div className="pt-1 flex-shrink-0">
                      <input type="checkbox" className="w-5 h-5 rounded border-slate-700 text-rose-500 focus:ring-rose-500/20 bg-transparent cursor-pointer" />
                    </div>
                    {/* min-w-0 is critical here: it prevents flexbox text overflow clipping */}
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                      <div className="flex sm:items-start justify-between gap-4 flex-col sm:flex-row w-full">
                        <span className="text-slate-200 font-medium leading-relaxed break-words whitespace-normal w-full">
                          {task}
                        </span>
                        {priority && (
                          <span className="text-xs font-bold tracking-wider uppercase text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-md flex-shrink-0 sm:self-start">
                            {priority}
                          </span>
                        )}
                      </div>
                      
                      {(owner || dueDate) && (
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                          {owner && (
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-500">Owner:</span> 
                              <span className="text-slate-300 font-semibold">{owner}</span>
                            </span>
                          )}
                          {owner && dueDate && <span className="text-slate-700 hidden sm:inline">|</span>}
                          {dueDate && (
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-500">Due:</span> 
                              <span className="text-slate-300 font-semibold">{dueDate}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            ) : (
              <p className="text-slate-500 italic p-4">No specific action items detected.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
