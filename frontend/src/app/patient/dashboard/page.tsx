"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { CalendarPlus, CalendarClock, Bot, ArrowRight } from "lucide-react"

interface Appointment {
  id: string
  scheduled_at: string
  status: string
  reason: string | null
  doctor: { full_name: string; specialty: string | null } | null
}

export default function PatientDashboardPage() {
  const [fullName, setFullName] = useState("")
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      if (profile) setFullName(profile.full_name)

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, reason, doctor:doctor_id(full_name, specialty)")
        .eq("patient_id", user.id)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(3)

      setUpcoming((appts as any) || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {fullName ? `Welcome back, ${fullName.split(" ")[0]}` : "Welcome back"}
        </h1>
        <p className="text-muted-foreground">Manage your appointments and get quick health guidance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/patient/appointments/book"
          className="group flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-md hover:border-primary/40"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Book Appointment</p>
              <p className="text-sm text-muted-foreground">Find a doctor and schedule a visit</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
        </Link>

        <Link
          href="/patient/assistant"
          className="group flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-md hover:border-primary/40"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Ask the AI Assistant</p>
              <p className="text-sm text-muted-foreground">Describe symptoms, get pointed to the right specialist</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
        </Link>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Upcoming Appointments</h2>
          </div>
          <Link href="/patient/appointments" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            You have no upcoming appointments.{" "}
            <Link href="/patient/appointments/book" className="text-primary hover:underline">Book one now</Link>.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border bg-muted/10 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    Dr. {a.doctor?.full_name || "TBD"}
                    {a.doctor?.specialty ? ` · ${a.doctor.specialty}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleString()} {a.reason ? `· ${a.reason}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
