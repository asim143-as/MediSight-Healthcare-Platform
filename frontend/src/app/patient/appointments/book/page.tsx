"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Doctor {
  id: string
  full_name: string
  specialty: string | null
  department: string | null
}

export default function BookAppointmentPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorId, setDoctorId] = useState("")
  const [date, setDate] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadDoctors = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, department")
        .eq("role", "doctor")
        .eq("available", true)
        .order("full_name")

      if (!error && data) setDoctors(data)
      setLoading(false)
    }
    loadDoctors()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("You must be signed in to book an appointment.")
      setSubmitting(false)
      return
    }

    if (!doctorId || !date) {
      setError("Please choose a doctor and a date/time.")
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: doctorId,
      scheduled_at: new Date(date).toISOString(),
      reason: reason || null,
      status: "Requested",
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push("/patient/appointments"), 1200)
    }
    setSubmitting(false)
  }

  const minDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Book an Appointment</h1>
        <p className="text-muted-foreground">Choose a doctor and a time that works for you.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label>Doctor</Label>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading doctors...</p>
          ) : doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctors are currently available for booking.</p>
          ) : (
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.full_name}{d.specialty ? ` — ${d.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date &amp; time</Label>
          <input
            id="date"
            type="datetime-local"
            value={date}
            min={minDateTime}
            onChange={(e) => setDate(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason for visit (optional)</Label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly describe why you'd like to see the doctor"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {error && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Appointment requested! Redirecting...</div>}

        <Button type="submit" className="w-full" disabled={submitting || doctors.length === 0}>
          {submitting ? "Booking..." : "Request Appointment"}
        </Button>
      </form>
    </div>
  )
}
