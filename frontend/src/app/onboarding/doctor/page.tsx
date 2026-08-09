"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DoctorOnboardingPage() {
  const [checking, setChecking] = useState(true)
  const [licenseNumber, setLicenseNumber] = useState("")
  const [hospital, setHospital] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [experience, setExperience] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      if (profile?.role === "doctor") {
        // Already applied — send them to the appropriate status page.
        router.push("/pending-approval")
        return
      }
      if (profile?.role && profile.role !== "patient") {
        // An existing clinical-staff account has no business here.
        router.push("/dashboard")
        return
      }
      setChecking(false)
    }
    check()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!licenseNumber.trim()) {
      setError("A medical license number is required.")
      return
    }

    setSubmitting(true)
    const { error } = await supabase.rpc("request_doctor_role", {
      p_license_number: licenseNumber,
      p_hospital: hospital || null,
      p_specialization: specialization || null,
      p_experience: experience ? parseInt(experience, 10) : null,
      p_phone: phone || null,
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    router.push("/pending-approval")
    router.refresh()
  }

  if (checking) return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complete Doctor Registration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            You're signed in — just a few more details to submit your application for administrator approval.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Medical license number (PMC/PMDC or equivalent)</Label>
            <Input id="licenseNumber" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hospital">Hospital / Clinic name</Label>
            <Input id="hospital" value={hospital} onChange={(e) => setHospital(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input id="specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Years of experience</Label>
              <Input id="experience" type="number" min={0} value={experience} onChange={(e) => setExperience(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {error && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit for Approval"}
          </Button>
        </form>
      </div>
    </div>
  )
}
