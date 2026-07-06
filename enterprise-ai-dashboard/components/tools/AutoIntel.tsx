"use client"

import { useState } from "react"
import { Loader2, AlertTriangle, Search, Brain, Mail, Presentation, Target } from "lucide-react"
import { ToolView } from "@/components/tool-view"

export function AutoIntel({ 
  onBack, 
  onSendToMail, 
  onGenerateSlides 
}: { 
  onBack: () => void; 
  onSendToMail?: (reportData: any) => void; 
  onGenerateSlides?: (reportData: any) => void 
}) {
  const [target, setTarget] = useState("")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [intelHistory, setIntelHistory] = useState<any[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const toggleHistory = async () => {
    if (!isHistoryOpen) {
      setHistoryLoading(true)
      try {
        const res = await fetch("http://localhost:8000/api/intel/history")
        const data = await res.json()
        if (data.error) {
          console.error(data.error)
          setIntelHistory([])
        } else {
          setIntelHistory(data)
        }
      } catch (err) {
        console.error("Failed to fetch history", err)
      } finally {
        setHistoryLoading(false)
      }
    }
    setIsHistoryOpen(!isHistoryOpen)
  }

  const handleClearHistory = async () => {
    try {
      await fetch("http://localhost:8000/api/intel/history", { method: "DELETE" })
      setIntelHistory([])
    } catch (err) {
      console.error("Failed to clear history", err)
    }
  }

  const handleSaveToMemory = async () => {
    if (!target || !report) return
    try {
      await fetch("http://localhost:8000/api/intel/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: target,
          response: report.summary
        })
      })
      const res = await fetch("http://localhost:8000/api/intel/history")
      const data = await res.json()
      if (!data.error) setIntelHistory(data)
    } catch (err) {
      console.error("Failed to save to memory", err)
    }
  }

  const run = async () => {
    if (!target.trim()) return
    setLoading(true); setError(null); setReport(null)
    try {
      const res = await fetch("http://localhost:8000/api/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      setReport(await res.json())
    } catch { setError("Failed to connect to backend. Is FastAPI running on port 8000?") }
    finally { setLoading(false) }
  }

  return (
    <ToolView onBack={onBack} label="Auto-Intel Node">
      <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="mb-1 text-xl font-semibold tracking-tight">Market Intelligence</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              Enter a target to generate a real-time intel report.
              {"\n"}Be patient for this tool, it may take a few minutes.
            </p>
          </div>
          
          <div className="relative z-50">
            <button
              onClick={toggleHistory}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm border ${isHistoryOpen ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'}`}
            >
              <span>🧠 Agent Memory</span>
              {historyLoading ? (
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
              ) : (
                <svg className={`w-4 h-4 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* Fly-out History Panel */}
            {isHistoryOpen && (
              <div className="absolute top-full right-0 mt-3 w-[360px] sm:w-[400px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[400px] overflow-hidden">
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center backdrop-blur-sm">
                  <span className="font-bold text-sm text-slate-300">Conversation Log</span>
                  <button 
                    onClick={handleClearHistory} 
                    className="px-3 py-1 text-xs font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 border border-rose-500/30 rounded-md transition-all"
                    title="Wipe Agent Memory"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="overflow-y-auto p-4 space-y-3 bg-slate-900/50">
                  {!intelHistory || (Array.isArray(intelHistory) ? intelHistory : (intelHistory as any)?.history || []).length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center italic bg-slate-950/30 rounded-lg">
                      Memory is clear. Run a search to populate history.
                    </div>
                  ) : (
                    (Array.isArray(intelHistory) ? intelHistory : (intelHistory as any)?.history || []).map((turn: any, idx: number) => (
                      <div key={idx} className="p-3 border border-slate-800 rounded-lg bg-slate-950/70 text-sm shadow-sm">
                        <span className={`font-bold uppercase text-[10px] tracking-wider block mb-1.5 ${turn.role === 'user' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                          {turn.role === 'user' ? 'You' : 'AI Agent'}
                        </span>
                        <p className="text-slate-300 leading-relaxed break-words whitespace-pre-wrap text-xs">
                          {turn.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />{error}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text" value={target}
            onChange={e => setTarget(e.target.value)}
            onKeyDown={e => e.key === "Enter" && run()}
            placeholder="e.g., Apple vs Microsoft…"
            className="flex-1 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/60"
          />
          <button onClick={run} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {loading ? "Researching…" : "Research"}
          </button>
        </div>
      </div>
      {report && (
        <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-semibold text-primary">Executive Summary</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleSaveToMemory}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <Brain className="size-3" /> Save to Memory
              </button>
              {onSendToMail && (
                <button
                  onClick={() => onSendToMail(report)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Mail className="size-3" /> Send to Mail
                </button>
              )}
              {onGenerateSlides && (
                <button
                  onClick={() => onGenerateSlides(report)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20 px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <Presentation className="size-3" /> Generate Slides
                </button>
              )}
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">{report.summary}</p>
          {report.opportunities?.length > 0 && (
            <>
              <h3 className="flex items-center gap-2 text-base font-semibold text-primary/80">
                <Target className="size-4" />Opportunities
              </h3>
              <ul className="space-y-2">
                {report.opportunities.map((o: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/20 p-3 text-sm text-foreground/80">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />{o}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </ToolView>
  )
}
