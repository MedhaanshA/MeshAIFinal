"use client"

import { motion } from "framer-motion"
import { BookUser, Radar, Mail, ScanText, AudioLines, Presentation, Receipt, Settings2 } from "lucide-react"
import { useState } from "react"
import { NodeTile } from "@/components/node-tile"
import { ContactsDrawer } from "@/components/contacts-drawer"

export type ToolId = "intel" | "mail" | "vision" | "meetings" | "presentation" | "expenses"

const NODES: Array<{
  icon: typeof Radar
  title: string
  description: string
  action: string
  rgb: string
  toolId: ToolId
}> = [
  {
    icon: Radar,
    title: "Auto-Intel",
    description:
      "Deploy active web-scraping clusters to assemble deep market intelligence and dynamic competitive reports.",
    action: "Launch Intel Node",
    rgb: "56 189 248",
    toolId: "intel",
  },
  {
    icon: Mail,
    title: "Auto-Mail",
    description:
      "Draft context-aware corporate email communications, synchronized updates, and instant message templates.",
    action: "Launch Mail Node",
    rgb: "167 139 250",
    toolId: "mail",
  },
  {
    icon: ScanText,
    title: "Multi-Modal Vision",
    description:
      "Extract structural data models and qualitative insights natively from local images and multi-page PDFs.",
    action: "Open Analyzer",
    rgb: "52 211 153",
    toolId: "vision",
  },
  {
    icon: AudioLines,
    title: "Meeting Synthesis",
    description:
      "Process multi-turn conversation logs, transcribe operational metrics, and extract action items.",
    action: "Launch Sync Node",
    rgb: "251 191 36",
    toolId: "meetings",
  },
  {
    icon: Presentation,
    title: "Presentation Engine",
    description:
      "Instantly render and compile structured corporate infographic slide decks from any topic brief.",
    action: "Generate Decks",
    rgb: "251 146 60",
    toolId: "presentation",
  },
  {
    icon: Receipt,
    title: "Expense Agent",
    description:
      "An autonomous ledger utility that tracks input transactions, aggregates sign-isolated streams, and compiles live fiscal reports.",
    action: "Open Expense Node",
    rgb: "251 113 133",
    toolId: "expenses",
  },
]

export function NodeGrid({ onNavigate }: { onNavigate: (tool: ToolId) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <section
        aria-label="Operational nodes"
        onMouseLeave={() => setHovered(null)}
        className="mt-12 grid flex-1 grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3"
      >
        {NODES.map((node, i) => (
          <NodeTile
            key={node.title}
            index={i}
            {...node}
            isFocused={hovered === i}
            isDimmed={hovered !== null && hovered !== i}
            onEnter={() => setHovered(i)}
            onLeave={() => setHovered(null)}
            onClick={() => onNavigate(node.toolId)}
          />
        ))}
      </section>

      {/* floating utility action bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-2xl border border-border bg-popover/85 p-2 backdrop-blur-2xl"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-secondary/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <BookUser className="size-4 text-primary" strokeWidth={1.75} />
          Directory &amp; Contacts
        </button>
      </motion.div>

      <ContactsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
