"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertTriangle, DollarSign, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react"
import { ToolView } from "@/components/tool-view"

export function Expenses({ onBack }: { onBack: () => void }) {
  const [reason, setReason] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"debit" | "credit">("debit")
  const [expenseData, setExpenseData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartTs, setChartTs] = useState(Date.now())

  const fetchExpenses = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("http://localhost:8000/api/expense")
      if (!res.ok) throw new Error("Failed to load expenses.")
      setExpenseData(await res.json()); setChartTs(Date.now())
    } catch { setError("Failed to fetch expense data. Ensure API is running.") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchExpenses() }, [])

  const handleAdd = async () => {
    if (!reason.trim() || !amount.trim()) return
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) { setError("Amount must be a positive number."); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch("http://localhost:8000/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, amount: type === "debit" ? -val : val }),
      })
      if (!res.ok) throw new Error("Failed to add transaction.")
      setReason(""); setAmount("")
      await fetchExpenses()
    } catch { setError("Failed to record transaction."); setLoading(false) }
  }

  const handleClear = async () => {
    setLoading(true)
    try {
      await fetch("http://localhost:8000/api/expense", { method: "DELETE" })
      await fetchExpenses()
    } catch { setError("Failed to clear entries."); setLoading(false) }
  }

  return (
    <ToolView onBack={onBack} label="Expense Agent">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />{error}
        </div>
      )}

      {/* Input panel */}
      <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <DollarSign className="size-4 text-primary" />Enterprise Expense Tracker
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">Manage credit/debit logs and review real-time matplotlib dashboard reporting.</p>
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Enter debit/credit reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Office catering, SaaS bill…"
              className="rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/60"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount ($)</label>
            <input type="number" step="0.01" min="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/60"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 grid grid-cols-2 rounded-xl border border-border bg-secondary/40 p-1">
              <button onClick={() => setType("debit")}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${type === "debit" ? "bg-destructive text-white" : "text-muted-foreground hover:text-foreground"}`}>
                Debit (-)
              </button>
              <button onClick={() => setType("credit")}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${type === "credit" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Credit (+)
              </button>
            </div>
            <button onClick={handleAdd} disabled={loading || !reason.trim() || !amount.trim()}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              Report
            </button>
          </div>
        </div>
      </div>

      {/* Summary metric cards */}
      {expenseData && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Credit", value: expenseData.credits, color: "text-emerald-400" },
            { label: "Total Debit", value: expenseData.debits, color: "text-destructive" },
            { label: "Net Balance", value: expenseData.balance, color: expenseData.balance >= 0 ? "text-emerald-400" : "text-destructive" },
            { label: "Absolute Total", value: expenseData.absolute_aggregate, color: "text-primary" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className={`mt-1 text-lg font-bold ${color}`}>
                ${(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart + transactions */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <div className="flex flex-col rounded-3xl border border-border bg-card/60 p-5 backdrop-blur-xl md:col-span-7">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visual Reporting (Matplotlib Chart)</p>
          <div className="flex aspect-[6.5/4.2] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary/20">
            {loading
              ? <Loader2 className="size-6 animate-spin text-muted-foreground" />
              : <img src={`http://localhost:8000/api/expense/chart?t=${chartTs}`} alt="Expense Chart" className="max-h-full max-w-full object-contain" />
            }
          </div>
        </div>
        <div className="flex h-80 flex-col rounded-3xl border border-border bg-card/60 p-5 backdrop-blur-xl md:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaction History</p>
            {expenseData?.records?.length > 0 && (
              <button onClick={handleClear}
                className="inline-flex items-center gap-1 text-xs text-destructive transition-colors hover:text-destructive/80">
                <Trash2 className="size-3" />Clear All Past Entries
              </button>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {expenseData?.records?.length > 0
              ? [...expenseData.records].reverse().map((rec: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
                  <span className="max-w-[55%] truncate text-xs font-medium text-foreground">{rec.reason}</span>
                  <span className={`text-xs font-bold ${rec.amount >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {rec.amount >= 0 ? "+" : "-"}${Math.abs(rec.amount).toFixed(2)}
                  </span>
                </div>
              ))
              : <div className="flex h-full items-center justify-center text-xs italic text-muted-foreground">No transactions recorded.</div>
            }
          </div>
        </div>
      </div>
    </ToolView>
  )
}
