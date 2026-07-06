"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { MeshHeader } from "@/components/mesh-header"
import { NodeGrid, type ToolId } from "@/components/node-grid"
import { ToolView } from "@/components/tool-view"
import { AutoIntel } from "@/components/tools/AutoIntel"
import { AutoMail } from "@/components/tools/AutoMail"
import { Vision } from "@/components/tools/Vision"
import { Expenses } from "@/components/tools/Expenses"
import Meetings from "@/components/tools/Meetings"
import PresentationEngine from "@/components/tools/PresentationEngine"

export default function Page() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const [mailInstruction, setMailInstruction] = useState("")
  const [presentationPrompt, setPresentationPrompt] = useState("")

  const bridgeToMailTool = (contextType: string, rawData: any) => {
    const formatRule = "\n\nCRITICAL: Format this with a standard corporate layout: Professional Greeting, Context, Bulleted Key Points, Clear Next Steps, and a Sign-off."
    if (contextType === "intel") {
      setMailInstruction(`Draft a strategic market intelligence update to the team regarding our research on target.\n\nData: ${JSON.stringify(rawData)}` + formatRule)
    } else if (contextType === "meetings") {
      setMailInstruction(`Draft a meeting action items update to the team.\n\nAction Items: ${rawData}` + formatRule)
    }
    setActiveTool("mail")
  }

  const bridgeToPresentationTool = (rawData: any) => {
    setPresentationPrompt(`Strategic Competitive Intelligence Report summary:\n${rawData.summary}\n\nOpportunities:\n${rawData.opportunities?.join('\n')}`)
    setActiveTool("presentation")
  }

  return (
    <main className="relative min-h-svh overflow-hidden">
      {/* ambient background (verbatim from mesh baseline) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-40 left-1/4 size-[36rem] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-1/5 size-[32rem] rounded-full bg-[rgb(167_139_250_/_0.08)] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(255 255 255 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.03) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        {/* Header is always visible */}
        <MeshHeader />

        {/* ---- Active component router ---- */}
        <AnimatePresence mode="wait">
          {activeTool === null && (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* NodeGrid fires onNavigate(toolId) on tile button click */}
              <NodeGrid onNavigate={(tool: ToolId) => setActiveTool(tool)} />
            </motion.div>
          )}

          {activeTool === "intel" && (
            <AutoIntel 
              key="intel" 
              onBack={() => setActiveTool(null)} 
              onSendToMail={(rep) => bridgeToMailTool("intel", rep)} 
              onGenerateSlides={(rep) => bridgeToPresentationTool(rep)}
            />
          )}

          {activeTool === "vision" && (
            <Vision key="vision" onBack={() => setActiveTool(null)} />
          )}

          {activeTool === "mail" && (
            <AutoMail 
              key="mail" 
              onBack={() => {
                setActiveTool(null)
                setMailInstruction("")
              }} 
              defaultInstruction={mailInstruction}
            />
          )}

          {/* Meetings — mounts <Meetings /> wrapped in ToolView */}
          {activeTool === "meetings" && (
            <ToolView key="meetings" onBack={() => setActiveTool(null)} label="Meeting Synthesis Node">
              <Meetings bridgeToMailTool={(type, data) => bridgeToMailTool(type, data)} />
            </ToolView>
          )}

          {/* Presentation Engine — mounts <PresentationEngine /> wrapped in ToolView */}
          {activeTool === "presentation" && (
            <ToolView 
              key="presentation" 
              onBack={() => {
                setActiveTool(null)
                setPresentationPrompt("")
              }} 
              label="Presentation Engine"
            >
              <PresentationEngine defaultPrompt={presentationPrompt} />
            </ToolView>
          )}

          {/* Expense Tracker */}
          {activeTool === "expenses" && (
            <Expenses key="expenses" onBack={() => setActiveTool(null)} />
          )}
        </AnimatePresence>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 font-mono text-xs text-muted-foreground">
          <span>Mesh AI · v3.2.0</span>
          <span>6 nodes · FastAPI :8000 · Enterprise Suite</span>
        </footer>
      </div>
    </main>
  )
}