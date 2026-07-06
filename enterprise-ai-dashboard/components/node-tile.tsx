"use client"

import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import type { MouseEvent } from "react"

export type NodeTileProps = {
  icon: LucideIcon
  title: string
  description: string
  action: string
  rgb: string
  index: number
  isFocused: boolean
  isDimmed: boolean
  onEnter: () => void
  onLeave: () => void
  onClick?: () => void
}

export function NodeTile({
  icon: Icon,
  title,
  description,
  action,
  rgb,
  index,
  isFocused,
  isDimmed,
  onEnter,
  onLeave,
  onClick,
}: NodeTileProps) {
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [12, -12]), { stiffness: 260, damping: 18 })
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-12, 12]), { stiffness: 260, damping: 18 })

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }

  function handleLeave() {
    mouseX.set(0.5)
    mouseY.set(0.5)
    onLeave()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{
        opacity: isDimmed ? 0.4 : 1,
        y: 0,
        scale: isFocused ? 1.05 : isDimmed ? 0.95 : 1,
        filter: isDimmed ? "blur(2px)" : "blur(0px)",
      }}
      transition={{
        opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.55, delay: 0.12 + index * 0.07, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        filter: { duration: 0.35 },
      }}
      style={{ perspective: 1200, zIndex: isFocused ? 20 : 1 }}
      className="group relative"
    >
      {/* neon glow */}
      <motion.div
        aria-hidden
        animate={{ opacity: isFocused ? 0.9 : 0 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-none absolute -inset-3 rounded-[1.75rem] blur-3xl"
        style={{ background: `radial-gradient(55% 55% at 50% 45%, rgb(${rgb} / 0.55), transparent 72%)` }}
      />

      <motion.div
        onMouseEnter={onEnter}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative flex h-full flex-col rounded-3xl border border-border bg-card p-6 backdrop-blur-xl transition-[background-color,border-color] duration-300 group-hover:bg-card/90"
      >
        {/* focus edge highlight */}
        <motion.div
          aria-hidden
          animate={{ opacity: isFocused ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            boxShadow: `inset 0 1px 0 0 rgb(${rgb} / 0.5), inset 0 0 30px -8px rgb(${rgb} / 0.35)`,
            borderRadius: "inherit",
          }}
        />

        <div style={{ transform: "translateZ(45px)" }} className="flex flex-1 flex-col">
          <div className="mb-5 flex items-center justify-between">
            <div
              className="flex size-12 items-center justify-center rounded-2xl border"
              style={{
                borderColor: `rgb(${rgb} / 0.3)`,
                background: `rgb(${rgb} / 0.12)`,
                boxShadow: `0 0 22px -6px rgb(${rgb} / 0.65)`,
              }}
            >
              <Icon className="size-6" style={{ color: `rgb(${rgb})` }} strokeWidth={1.75} />
            </div>
            <span
              className="size-2 rounded-full"
              style={{ background: `rgb(${rgb})`, boxShadow: `0 0 8px 1px rgb(${rgb} / 0.8)` }}
              aria-hidden
            />
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-foreground text-balance">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>

          <button
            type="button"
            onClick={onClick}
            className="mt-6 inline-flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-300 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ ["--tw-ring-color" as string]: `rgb(${rgb})` }}
          >
            <span>{action}</span>
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              style={{ color: `rgb(${rgb})` }}
            />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
