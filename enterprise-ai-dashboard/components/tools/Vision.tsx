"use client"

import { useState, useRef } from "react"
import { Loader2, AlertTriangle, UploadCloud, FileText } from "lucide-react"
import { ToolView } from "@/components/tool-view"

export function Vision({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setFileType(file.type)
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null)
    setLoading(true); setError(null); setData(null)
    const fd = new FormData(); fd.append("file", file)
    try {
      const res = await fetch("http://localhost:8000/api/vision", { method: "POST", body: fd })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      setData(JSON.stringify(await res.json(), null, 2))
    } catch { setError("Failed to upload and analyze. Ensure FastAPI is running.") }
    finally { setLoading(false) }
  }

  return (
    <ToolView onBack={onBack} label="Multi-Modal Vision">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />{error}
        </div>
      )}
      <div onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card/40 p-14 text-center transition-colors hover:border-primary/40 hover:bg-card/60">
        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary/40">
          <UploadCloud className="size-8 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-semibold text-foreground">Document &amp; Image Intelligence</p>
          <p className="mt-1 text-sm text-muted-foreground">Click to upload an image or PDF for AI analysis</p>
        </div>
        {loading && <Loader2 className="size-6 animate-spin text-primary" />}
      </div>
      {(preview || fileType === "application/pdf" || data) && !loading && (
        <div className="grid grid-cols-2 gap-5">
          <div className="flex h-72 items-center justify-center overflow-hidden rounded-3xl border border-border bg-card/60 p-4">
            {fileType === "application/pdf"
              ? <div className="flex flex-col items-center gap-2 text-primary"><FileText className="size-14" strokeWidth={1.5} /><span className="text-sm font-medium text-foreground">PDF Document</span></div>
              : preview && <img src={preview} alt="Preview" className="max-h-full rounded-xl object-contain" />}
          </div>
          <div className="h-72 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary/85 border-b border-slate-800 pb-2">Extracted Data Analysis</h3>
            {(() => {
              try {
                const parsed = data ? JSON.parse(data) : null;
                if (parsed && typeof parsed === 'object') {
                  return (
                    <div className="space-y-4">
                      {parsed.summary && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Summary</h4>
                          <p className="mt-1 text-sm text-slate-300 leading-relaxed">{parsed.summary}</p>
                        </div>
                      )}
                      {parsed.key_elements && parsed.key_elements.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Key Elements</h4>
                          <ul className="mt-1.5 space-y-1">
                            {parsed.key_elements.map((el: string, idx: number) => (
                              <li key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-indigo-400" />
                                {el}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {parsed.insight && (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 mt-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Actionable Insight</h4>
                          <p className="mt-1 text-xs text-slate-400 leading-relaxed italic">"{parsed.insight}"</p>
                        </div>
                      )}
                    </div>
                  );
                }
              } catch (e) {}
              return <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">{data}</pre>;
            })()}
          </div>
        </div>
      )}
    </ToolView>
  )
}
