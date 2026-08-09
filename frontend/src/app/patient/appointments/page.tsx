"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { CalendarPlus } from "lucide-react"

interface Appointment {
  id: string
  scheduled_at: string
  status: string
  reason: string | null
  doctor: { full_name: string; specialty: string | null } | null
}

export default function MyAppointmentsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date().toISOString()
    let query = supabase
      .from("appointments")
      .select("id, scheduled_at, status, reason, doctor:doctor_id(full_name, specialty)")
      .eq("patient_id", user.id)

    query = tab === "upcoming"
      ? query.gte("scheduled_at", now).order("scheduled_at", { ascending: true })
      : query.lt("scheduled_at", now).order("scheduled_at", { ascending: false })

    const { data } = await query
    setAppointments((data as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const handleCancel = async (id: string) => {
    await supabase.from("appointments").update({ status: "Cancelled" }).eq("id", id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-muted-foreground">View and manage your bookings.</p>
        </div>
        <Link href="/patient/appointments/book">
          <Button className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            Book New
          </Button>
        </Link>
      </div>

      <div className="inline-flex rounded-2xl border bg-muted/40 p-1">
        <button
          onClick={() => setTab("upcoming")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "upcoming" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab("past")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "past" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Past
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No {tab} appointments.
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
              <div>
                <p className="font-medium">
                  Dr. {a.doctor?.full_name || "TBD"}
                  {a.doctor?.specialty ? ` · ${a.doctor.specialty}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(a.scheduled_at).toLocaleString()} {a.reason ? `· ${a.reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  a.status === "Cancelled" ? "bg-destructive/10 text-destructive" :
                  a.status === "Completed" ? "bg-muted text-muted-foreground" :
                  "bg-primary/10 text-primary"
                }`}>
                  {a.status}
                </span>
                {tab === "upcoming" && a.status !== "Cancelled" && (
                  <Button variant="outline" size="sm" onClick={() => handleCancel(a.id)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
