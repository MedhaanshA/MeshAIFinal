"use client"

import { motion } from "framer-motion"

export function MeshHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary/80">
          Orchestration Console
        </p>
        <h1 className="relative mt-3 text-5xl font-semibold leading-none tracking-tighter text-foreground text-balance sm:text-6xl lg:text-7xl">
          <span className="relative inline-block">
            Mesh
            <span
              aria-hidden
              className="absolute -inset-x-2 inset-y-0 -z-10 blur-2xl"
              style={{ background: "radial-gradient(50% 60% at 50% 50%, rgb(56 189 248 / 0.35), transparent 75%)" }}
            />
          </span>{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(120deg, rgb(56 189 248), rgb(94 234 212))" }}
          >
            AI
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-2.5 self-start rounded-full border border-border bg-card px-4 py-2 backdrop-blur-xl sm:self-auto">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.75)]" />
        </span>
        <span className="text-xs font-medium tracking-wide text-foreground/90">All Nodes Synchronized</span>
      </div>
    </motion.header>
  )
}
