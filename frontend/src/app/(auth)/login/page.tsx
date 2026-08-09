"use client"
import { useState, type FormEvent, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const [portal, setPortal] = useState<"patient" | "doctor">("patient")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackError = searchParams.get("error")

  const supabase = createClient()

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const credentials = identifier.includes("@")
      ? { email: identifier, password }
      : { phone: identifier, password }

    const { data, error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Enforced again server-side by middleware — this just gives a fast,
    // portal-specific error instead of a silent redirect after the fact.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()

    const staffRoles = ["doctor", "super_admin", "hospital_admin", "nurse", "data_scientist"]
    const actualRole = profile?.role

    if (portal === "doctor" && (!actualRole || !staffRoles.includes(actualRole))) {
      await supabase.auth.signOut()
      setError("This account is registered as a Patient. Please sign in through the Patient Portal.")
      setLoading(false)
      return
    }

    if (portal === "patient" && actualRole !== "patient") {
      await supabase.auth.signOut()
      setError("This account is registered as a Doctor. Please sign in through the Doctor Portal.")
      setLoading(false)
      return
    }

    if (actualRole === "doctor") {
      const { data: doctor } = await supabase
        .from("doctors")
        .select("status")
        .eq("user_id", data.user.id)
        .single()

      if (doctor?.status === "pending") {
        await supabase.auth.signOut()
        setError("Your account is awaiting administrator approval.")
        setLoading(false)
        return
      }
      if (doctor?.status === "rejected") {
        await supabase.auth.signOut()
        setError("Your doctor registration has been rejected. Please contact the administrator.")
        setLoading(false)
        return
      }
    }

    router.push(actualRole === "patient" ? "/patient/dashboard" : "/dashboard")
    router.refresh()
    setLoading(false)
  }

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider)
    setError(null)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    // No explicit `next` here — /auth/callback resolves the right home by
    // the user's actual role/status, whether they're a patient, a returning
    // approved doctor, or (for a first-time Google/Apple doctor signup)
    // gets routed into the doctor verification form automatically.
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Decorative gradient blobs */}
      <div className="blob -left-32 -top-32 h-96 w-96 bg-primary" />
      <div className="blob -right-24 top-1/3 h-96 w-96 bg-violet" />
      <div className="blob bottom-0 left-1/3 h-72 w-72 bg-cyan" />

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-border/60 shadow-premium md:grid-cols-2">
        {/* Brand / marketing panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-brand p-10 text-white md:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
              <span className="text-xs font-bold tracking-wider">MAI</span>
            </div>
            <span className="font-heading text-lg font-bold">MediSight AI</span>
          </div>
          <div className="relative z-10 space-y-5">
            <h2 className="font-heading text-3xl font-bold leading-tight">
              Clinical intelligence, delivered with confidence.
            </h2>
            <p className="max-w-sm text-sm leading-6 text-white/80">
              Predictive risk models, explainable AI, and real-time patient insights — all in one secure workspace built for modern care teams.
            </p>
            <ul className="space-y-3 text-sm text-white/85">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan" /> Early disease risk prediction</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan" /> SHAP-powered explainability</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan" /> HIPAA-minded, enterprise-grade security</li>
            </ul>
          </div>
          <p className="relative z-10 text-xs text-white/60">Trusted by clinical teams to make faster, safer decisions.</p>
        </div>

        {/* Form panel */}
        <div className="glass-panel flex flex-col justify-center bg-card/95 px-8 py-10 md:px-12 md:py-12">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="kicker">Welcome back</p>
              <h1 className="font-heading text-3xl font-bold text-foreground">Sign in to your workspace</h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Securely access your AI healthcare workspace and resume your patient insights in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => { setPortal("patient"); setError(null) }}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  portal === "patient" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Patient Portal
              </button>
              <button
                type="button"
                onClick={() => { setPortal("doctor"); setError(null) }}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  portal === "doctor" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Doctor Portal
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Phone</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                    <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z" fill="currentColor" />
                  </svg>
                  <Input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="Enter your email or phone number"
                    required
                    className="border-0 bg-transparent px-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                  <svg width="20" height="20" viewBox="-64 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                    <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0" fill="currentColor" />
                    <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0" fill="currentColor" />
                  </svg>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="border-0 bg-transparent px-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 576 512" className="h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M572.52 241.4c-1.67-3.07-41.66-76.98-110.56-136.55C402.72 64.91 343.35 32 288 32c-6.75 0-13.42.24-20 .68C192.03 39.88 115.03 90.64 56.14 163.44c-3.1 3.82-3.09 9.12.03 12.94C57.81 179.4 128 288 128 288s70.19 108.6 14.43 111.62C78.55 402.72 63.41 404 48 404c-8 0-16-1.22-16-9.34 0-69.5 57.86-192.36 160.19-238.21 9.65-3.8 20.03 1.95 23.83 11.6 3.8 9.66-1.95 20.03-11.6 23.83C146.53 204.8 96 250.91 96 256c0 30.87 75.02 128 192 128s192-97.13 192-128c0-6.08-50.52-51.19-128.43-94.12-9.66-3.8-15.4-14.17-11.6-23.83 3.8-9.65 14.18-15.4 23.83-11.6 102.33 44.22 160.19 168.07 160.19 238.21 0 8.12-8 9.34-16 9.34-15.41 0-30.55-1.28-43.56-4.78-55.76-3.02 14.43-111.62 14.43-111.62s70.19-108.6 14.43-111.62z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 576 512" className="h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M572.52 241.4c-1.67-3.07-41.66-76.98-110.56-136.55C402.72 64.91 343.35 32 288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Remember me
                </label>
                <span className="text-sm text-muted-foreground">Secure session</span>
              </div>

              {callbackError && <div className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">⚠️ {callbackError}</div>}
              {error && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

              <Button type="submit" variant="gradient" className="w-full py-3" disabled={loading}>
                {loading ? "Signing in..." : portal === "doctor" ? "Sign In as Doctor" : "Sign In"}
              </Button>
            </form>

            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or continue with <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("apple")}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                Apple
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {portal === "doctor"
                ? "Signing in as a doctor for the first time via Google/Apple? You'll be asked to complete a short verification form."
                : "Google and Apple sign-in require those providers to be enabled in your Supabase Auth settings."}
            </p>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
