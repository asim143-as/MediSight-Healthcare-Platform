"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, Lock, Mail, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()

    if (profile?.role !== "super_admin") {
      await supabase.auth.signOut()
      setError("This account does not have admin access.")
      setLoading(false)
      return
    }

    router.push("/admin-portal/dashboard")
    router.refresh()
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0505] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.15),transparent_60%)]" />
      <div className="blob left-1/4 top-1/4 h-72 w-72 bg-red-600 opacity-20" />
      <div className="blob right-1/4 bottom-1/4 h-72 w-72 bg-red-900 opacity-20" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-red-500/20 bg-[#120909]/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/15 text-red-500">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">Admin Console</h1>
          <p className="mt-1.5 text-sm text-white/50">Restricted access — authorized administrators only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-white/70">Admin Email</Label>
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-white/5 px-3 py-2.5">
              <Mail className="h-4 w-4 text-white/40" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@medisight.ai"
                className="border-0 bg-transparent px-0 text-white placeholder:text-white/30 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70">Password</Label>
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-white/5 px-3 py-2.5">
              <Lock className="h-4 w-4 text-white/40" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="border-0 bg-transparent px-0 text-white placeholder:text-white/30 focus-visible:ring-0"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3 text-white hover:bg-red-700"
          >
            {loading ? "Verifying..." : "Sign In to Admin Console"}
          </Button>
        </form>

        <Link href="/welcome" className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/40 transition hover:text-white/70">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to main site
        </Link>
      </div>
    </div>
  )
}
