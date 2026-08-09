"use client"

import { useState } from "react"
import { X, Save, KeyRound, Trash2, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type EditableUser = {
  id: string
  full_name: string
  email: string
  phone?: string | null
  specialty?: string | null
  department?: string | null
}

type Field = { key: keyof EditableUser; label: string; type?: string }

export function AdminUserModal({
  user,
  fields,
  onClose,
  onSaved,
  onDeleted,
}: {
  user: EditableUser
  fields: Field[]
  onClose: () => void
  onSaved: (updated: Partial<EditableUser>) => void
  onDeleted: () => void
}) {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, (user[f.key] as string) || ""]))
  )
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setError("")
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || "Failed to save changes.")
      return
    }
    setNotice("Saved successfully.")
    onSaved(form)
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setResetting(true)
    setError("")
    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, newPassword }),
    })
    const data = await res.json()
    setResetting(false)
    if (!res.ok) {
      setError(data.error || "Failed to reset password.")
      return
    }
    setNewPassword("")
    setNotice("Password reset successfully.")
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError("")
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) {
      setError(data.error || "Failed to delete account.")
      return
    }
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-heading text-lg font-bold">Manage {user.full_name || "User"}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Profile fields */}
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type={f.type || "text"}
                  value={form[f.key]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <Button onClick={handleSave} disabled={saving} variant="gradient" size="sm" className="w-full">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save Changes
            </Button>
          </div>

          {/* Reset password */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <KeyRound className="h-3.5 w-3.5" /> Reset Password
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="New password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-sm"
              />
              <Button onClick={handleResetPassword} disabled={resetting} variant="outline" size="sm">
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Passwords can't be viewed — this sets a brand new one for the user.
            </p>
          </div>

          {/* Delete */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Danger Zone
            </p>
            {!confirmDelete ? (
              <Button onClick={() => setConfirmDelete(true)} variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete Account
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">This permanently deletes the account and all related data. Are you sure?</p>
                <div className="flex gap-2">
                  <Button onClick={handleDelete} disabled={deleting} variant="destructive" size="sm" className="flex-1">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete Permanently"}
                  </Button>
                  <Button onClick={() => setConfirmDelete(false)} variant="outline" size="sm">Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {error && <div className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">{error}</div>}
          {notice && <div className="rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-600">{notice}</div>}
        </div>
      </div>
    </div>
  )
}
