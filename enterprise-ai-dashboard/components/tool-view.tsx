"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"

export function ToolView({
  onBack,
  label,
  children,
}: {
  onBack: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      key="tool"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-6 mt-12 sm:mt-16"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Console
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary/80">{label}</span>
      </div>
      {children}
    </motion.div>
  )
}
