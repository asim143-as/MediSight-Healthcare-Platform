"use client"

import { useEffect, useState } from "react"
import { UserCircle, Save, KeyRound, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminAccountPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email || "")
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      setFullName(profile?.full_name || "")
    })
  }, [])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setError("")
    setNotice("")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)
    setSavingProfile(false)
    if (err) { setError(err.message); return }
    setNotice("Profile updated.")
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setSavingPassword(true)
    setError("")
    setNotice("")
    // Self-service — changing your OWN password only needs a normal
    // authenticated session, not the service-role admin API.
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (err) { setError(err.message); return }
    setNewPassword("")
    setNotice("Password changed successfully.")
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">My Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your own admin login credentials.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <UserCircle className="h-4 w-4 text-primary" /> Profile
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Email (read-only)</Label>
            <Input value={email} disabled className="opacity-60" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <Button onClick={handleSaveProfile} disabled={savingProfile} variant="gradient" size="sm">
            {savingProfile ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-primary" /> Change Password
        </p>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline" size="sm">
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>}
      {notice && <div className="rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600">{notice}</div>}
    </div>
  )
}
