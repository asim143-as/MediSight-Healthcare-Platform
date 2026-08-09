"use client"
import { useState, type FormEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function SignupPage() {
  const [portal, setPortal] = useState<"patient" | "doctor">("patient")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Doctor-only fields
  const [licenseNumber, setLicenseNumber] = useState("")
  const [hospital, setHospital] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [experience, setExperience] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null)

  const supabase = createClient()

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMsg(null)

    if (portal === "doctor" && !licenseNumber.trim()) {
      setError("A medical license number (PMC/PMDC or equivalent) is required for doctor registration.")
      setLoading(false)
      return
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error } = await supabase.auth.signUp({
      email,
      password,
      phone,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          full_name: fullName,
          role: portal, // 'patient' or 'doctor' — read by the handle_new_user DB trigger
          ...(portal === "doctor" && {
            license_number: licenseNumber,
            hospital,
            specialization,
            experience,
            phone,
          }),
        },
      },
    })

    if (error) {
      setError(error.message)
    } else if (portal === "doctor") {
      setMsg("Check your email to confirm your account. Once confirmed, your doctor application will be reviewed by an administrator before you can access the Doctor Portal.")
    } else {
      setMsg("Check your email for the confirmation link.")
    }
    setLoading(false)
  }

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider)
    setError(null)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    // Google/Apple can only ever create a 'patient' account directly (there's
    // no form step during the OAuth redirect to collect a license number).
    // A doctor signing up via OAuth is authenticated as a patient first, then
    // sent to complete the doctor-verification form before being marked
    // role=doctor, status=pending.
    const next = portal === "doctor" ? "/onboarding/doctor" : "/patient/dashboard"
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950/10 px-4 py-10">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/5 backdrop-blur-md">
        <div className="grid gap-8 px-8 py-10 grid-cols-1 md:px-12 md:py-12">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Welcome to MediSight</p>
              <h1 className="text-3xl font-semibold text-slate-950">Create your account</h1>
              <p className="max-w-xl text-sm leading-6 text-slate-600">
                Start your journey with MediSight AI and access secure clinical insights in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => { setPortal("patient"); setError(null) }}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  portal === "patient" ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                I'm a Patient
              </button>
              <button
                type="button"
                onClick={() => { setPortal("doctor"); setError(null) }}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  portal === "doctor" ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                I'm a Doctor
              </button>
            </div>

            {portal === "doctor" && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                Doctor accounts require administrator approval before the Doctor Portal becomes accessible.
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                    className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {portal === "doctor" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Medical license number (PMC/PMDC or equivalent)</Label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                      <input
                        id="licenseNumber"
                        type="text"
                        value={licenseNumber}
                        onChange={e => setLicenseNumber(e.target.value)}
                        placeholder="e.g. PMC-12345"
                        required
                        className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hospital">Hospital / Clinic name</Label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                      <input
                        id="hospital"
                        type="text"
                        value={hospital}
                        onChange={e => setHospital(e.target.value)}
                        placeholder="Enter your hospital or clinic"
                        required
                        className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                        <input
                          id="specialization"
                          type="text"
                          value={specialization}
                          onChange={e => setSpecialization(e.target.value)}
                          placeholder="e.g. Cardiology"
                          required
                          className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of experience</Label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                        <input
                          id="experience"
                          type="number"
                          min={0}
                          value={experience}
                          onChange={e => setExperience(e.target.value)}
                          placeholder="e.g. 6"
                          required
                          className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/60"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
              {msg && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>}

              <Button type="submit" className="w-full rounded-2xl py-3" disabled={loading}>
                {loading ? "Signing up..." : portal === "doctor" ? "Apply as Doctor" : "Sign Up"}
              </Button>
            </form>

            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or continue with <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("apple")}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                Apple
              </button>
            </div>
            {portal === "doctor" && (
              <p className="text-center text-xs text-slate-500">
                Google/Apple sign-up as a doctor takes you to a short verification form right after — your account
                stays pending until an administrator approves it.
              </p>
            )}

            <div className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Why join?</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                Secure AI-powered patient insights
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                Clinical risk prediction dashboards
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                Fast onboarding with healthcare workflows
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
