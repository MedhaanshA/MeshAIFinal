"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertTriangle, Users, PenTool, Send } from "lucide-react"
import { ToolView } from "@/components/tool-view"

export function AutoMail({ onBack, defaultInstruction }: { onBack: () => void; defaultInstruction?: string }) {
  const localContactsList = [
    { name: "Yash", email: "yash@mesh.ai" },
    { name: "Team", email: "team@mesh.ai" }
  ];

  const [mailTo, setMailTo] = useState("")
  const [aboutText, setAboutText] = useState(defaultInstruction || "")
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contacts, setContacts] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [mailRecipient, setMailRecipient] = useState("")

  const lookupRecipientByName = (nameInput: string, currentContacts: any[]) => {
    const val = nameInput.trim().toLowerCase()
    if (!val) {
      setMailRecipient("")
      return
    }
    const combined = [...currentContacts, ...localContactsList]
    
    // Normalize and match exactly
    let match = combined.find(c => c.name.trim().toLowerCase() === val)
    
    // Fallback match parts
    if (!match) {
      match = combined.find(c => {
        const contactName = c.name.trim().toLowerCase()
        const nameParts = contactName.split(" ")
        return nameParts.includes(val) ||
               contactName.startsWith(val) || 
               val.startsWith(contactName) || 
               nameParts.some((part: string) => part.length > 2 && val.includes(part))
      })
    }
    
    if (match) {
      setMailRecipient(match.email)
    } else {
      setMailRecipient("")
    }
  }

  useEffect(() => {
    const loadDirectory = async () => {
      // 1. Try to load from localStorage first
      let storedContacts: any[] = []
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("contacts_list")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed)) {
              storedContacts = parsed.map((c: any) => ({
                name: c.name || "",
                email: c.email || "",
                role: c.role || ""
              }))
            }
          } catch (e) {}
        }
      }

      // 2. Robust initialization fallback block if storage is empty
      if (storedContacts.length === 0) {
        const defaultList = [
          { name: "Ada Okafor", email: "ada@mesh.ai", role: "Ops Lead" },
          { name: "Ravi Menon", email: "ravi@mesh.ai", role: "Data Engineer" },
          { name: "Lena Ford", email: "lena@mesh.ai", role: "Finance" },
          ...localContactsList.map(c => ({ name: c.name, email: c.email, role: "" }))
        ]
        if (typeof window !== "undefined") {
          localStorage.setItem("contacts_list", JSON.stringify(defaultList))
        }
        storedContacts = defaultList
      }

      setContacts(storedContacts)

      // 3. Sync with backend API to merge endpoints
      try {
        const cRes = await fetch("http://localhost:8000/api/contacts")
        const tRes = await fetch("http://localhost:8000/api/teams")
        if (cRes.ok && tRes.ok) {
          const fetchedContacts = await cRes.json()
          setTeams(await tRes.json())
          
          const merged = [...storedContacts]
          for (const bc of fetchedContacts) {
            if (!merged.some(c => c.email.toLowerCase() === bc.email.toLowerCase())) {
              merged.push({
                name: bc.name || "",
                email: bc.email || "",
                role: bc.role || ""
              })
            }
          }
          setContacts(merged)
          if (typeof window !== "undefined") {
            localStorage.setItem("contacts_list", JSON.stringify(merged))
          }
          
          if (defaultInstruction) {
            setAboutText(defaultInstruction)
            // Auto-extract recipient name if present in defaultInstruction
            const match = defaultInstruction.toLowerCase().match(/(?:to|mail|email|send\s+to)\s+([a-zA-Z0-9\s]+)/i)
            if (match && match[1]) {
              const namePart = match[1].trim()
              setMailTo(namePart)
              lookupRecipientByName(namePart, merged)
            } else {
              // Fallback: search for any contact name within defaultInstruction
              for (const c of merged) {
                const nameParts = c.name.toLowerCase().split(" ")
                const hasMatch = nameParts.some((part: string) => part.length > 2 && defaultInstruction.toLowerCase().includes(part))
                if (hasMatch) {
                  setMailTo(c.name)
                  setMailRecipient(c.email)
                  break
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to load directory for mail tool", e)
      }
    }
    loadDirectory()
  }, [defaultInstruction])

  useEffect(() => {
    if (defaultInstruction) {
      setAboutText(defaultInstruction)
    }
  }, [defaultInstruction])

  const getProfile = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_profile")
      if (saved) {
        try { return JSON.parse(saved) } catch (e) {}
      }
    }
    return { name: "", role: "", company: "" }
  }

  const handleDraft = async () => {
    if (!aboutText.trim()) return
    setLoading(true); setError(null); setDraft(null)

    // Smoothly combine the inputs into the prompt context payload
    const userProfile = getProfile()
    const enrichedInstruction = `Compose an email about: ${aboutText}` + 
      `\n\nCRITICAL: Automatically sign off the email with the sender profile details:
Sender Name: ${userProfile.name}
Sender Role: ${userProfile.role}
Sender Company: ${userProfile.company}
Do NOT use generic brackets like [Your Name] or [Your Role]. Use the specific values provided above.`

    try {
      const res = await fetch("http://localhost:8000/api/mail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: enrichedInstruction, to_email: mailRecipient }),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      setDraft(await res.json())
    } catch { setError("Failed to draft email. Ensure FastAPI is running.") }
    finally { setLoading(false) }
  }

  return (
    <ToolView onBack={onBack} label="Auto-Mail Node">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />{error}
        </div>
      )}
      
      <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl space-y-4">
        {/* Mail To: Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Mail To (Name):</label>
            {mailRecipient && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded animate-in fade-in">
                Maps to: {mailRecipient}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 bg-secondary/40 border border-border rounded-xl px-4.5 py-3 focus-within:border-primary/60 transition-colors">
            <Users className="size-4 shrink-0 text-slate-500" />
            <input 
              type="text" 
              value={mailTo}
              onChange={e => {
                const val = e.target.value
                setMailTo(val)
                lookupRecipientByName(val, contacts)
              }}
              placeholder="Enter contact name (e.g. Yash)"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
          </div>
        </div>

        {/* About: Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">About (Email Purpose):</label>
          <div className="flex items-start gap-3 bg-secondary/40 border border-border rounded-xl px-4.5 py-3 focus-within:border-primary/60 transition-colors">
            <PenTool className="size-4 shrink-0 text-slate-500 mt-1" />
            <textarea
              value={aboutText}
              onChange={e => setAboutText(e.target.value)}
              placeholder="Describe email purpose (e.g. welcome him to the team)"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button 
            onClick={handleDraft} 
            disabled={loading || !aboutText.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Draft Email"}
          </button>
        </div>
      </div>

      {draft && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card/60 backdrop-blur-xl animate-in fade-in zoom-in-95">
          {draft.subject === "Blocked by Guardrails" && (
            <div className="bg-destructive px-5 py-2 text-center text-sm font-bold text-white">⚠️ Content Flagged by Safety Guardrails</div>
          )}
          <div className="flex items-center gap-3 border-b border-border px-5 py-3 text-sm">
            <span className="w-14 text-muted-foreground">To:</span>
            <span className="text-foreground">{draft.recipient || mailRecipient}</span>
          </div>
          <div className="flex items-center gap-3 border-b border-border px-5 py-3 text-sm">
            <span className="w-14 text-muted-foreground">Subject:</span>
            <input type="text" value={draft.subject}
              onChange={e => setDraft({ ...draft, subject: e.target.value })}
              className="flex-1 bg-transparent font-medium text-foreground outline-none"
            />
          </div>
          <textarea value={draft.body}
            onChange={e => setDraft({ ...draft, body: e.target.value })}
            className="h-72 w-full resize-none bg-transparent px-5 py-5 text-sm leading-relaxed text-foreground/80 outline-none whitespace-pre-wrap"
          />
          <div className="flex justify-end border-t border-border bg-secondary/20 px-5 py-3">
            <button
              onClick={() => {
                const su = encodeURIComponent(draft.subject)
                const bo = encodeURIComponent(draft.body)
                window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${draft.recipient || mailRecipient}&su=${su}&body=${bo}`, "_blank")
              }}
              disabled={draft.subject === "Blocked by Guardrails"}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="size-4" />Open in Gmail
            </button>
          </div>
        </div>
      )}
    </ToolView>
  )
}
