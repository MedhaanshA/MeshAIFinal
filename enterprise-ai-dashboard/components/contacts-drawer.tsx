"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Pencil, Plus, Trash2, UserRound, X } from "lucide-react"
import { useState } from "react"

export type Contact = {
  id: string
  name: string
  role: string
  email: string
}

const INITIAL: Contact[] = [
  { id: "c1", name: "Ada Okafor", role: "Ops Lead", email: "ada@mesh.ai" },
  { id: "c2", name: "Ravi Menon", role: "Data Engineer", email: "ravi@mesh.ai" },
  { id: "c3", name: "Lena Ford", role: "Finance", email: "lena@mesh.ai" },
]

const EMPTY_FORM = { name: "", role: "", email: "" }

export function ContactsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("contacts_list")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            return parsed.map((c: any) => ({
              id: c.id || crypto.randomUUID(),
              name: c.name || "",
              email: c.email || "",
              role: c.role || ""
            }))
          }
        } catch (e) {}
      }
      const initialWithUniformSchema = INITIAL.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        role: c.role
      }))
      localStorage.setItem("contacts_list", JSON.stringify(initialWithUniformSchema))
      return initialWithUniformSchema
    }
    return INITIAL
  })

  const saveContacts = (updated: Contact[]) => {
    setContacts(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("contacts_list", JSON.stringify(updated))
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [profile, setProfile] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_profile")
      if (saved) {
        try { return JSON.parse(saved) } catch (e) {}
      }
    }
    return { name: "", role: "", company: "" }
  })

  const saveProfile = (newProfile: any) => {
    setProfile(newProfile)
    if (typeof window !== "undefined") {
      localStorage.setItem("user_profile", JSON.stringify(newProfile))
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    let updated: Contact[]
    if (editingId) {
      updated = contacts.map((c) => (c.id === editingId ? { ...c, ...form } : c))
    } else {
      updated = [...contacts, { id: crypto.randomUUID(), ...form }]
    }
    saveContacts(updated)
    resetForm()
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id)
    setForm({ name: contact.name, role: contact.role, email: contact.email })
  }

  function remove(id: string) {
    const updated = contacts.filter((c) => c.id !== id)
    saveContacts(updated)
    if (editingId === id) resetForm()
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary/60 focus:bg-secondary/60"

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-label="Directory and contacts"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-popover/95 backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80">Network</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Directory &amp; Contacts</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close directory"
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* User Profile Form */}
            <div className="border-b border-border bg-secondary/15 px-6 py-4 space-y-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-primary/85">User Profile (Email Sign-off)</p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/50"
                  placeholder="Your Name"
                  value={profile.name}
                  onChange={(e) => saveProfile({ ...profile, name: e.target.value })}
                />
                <input
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/50"
                  placeholder="Your Role"
                  value={profile.role}
                  onChange={(e) => saveProfile({ ...profile, role: e.target.value })}
                />
                <input
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/50"
                  placeholder="Your Company"
                  value={profile.company}
                  onChange={(e) => saveProfile({ ...profile, company: e.target.value })}
                />
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-6 py-5">
              {contacts.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">No contacts yet. Add one below.</p>
              )}
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 backdrop-blur-xl"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                    <UserRound className="size-5 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.role ? `${c.role} · ` : ""}
                      {c.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    aria-label={`Edit ${c.name}`}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label={`Delete ${c.name}`}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 border-t border-border px-6 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                {editingId ? "Edit contact" : "Add contact"}
              </p>
              <input
                className={inputClass}
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  placeholder="Role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="size-4" />
                  {editingId ? "Save changes" : "Add contact"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
