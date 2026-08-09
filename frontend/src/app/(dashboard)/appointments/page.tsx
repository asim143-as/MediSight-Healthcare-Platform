"use client"

import { useEffect, useState } from "react"
import { Calendar, Clock, CheckCircle2, XCircle, CheckCheck, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

type Appointment = {
  id: string
  scheduled_at: string
  status: "Requested" | "Confirmed" | "Completed" | "Cancelled"
  reason: string | null
  notes: string | null
  patient: { full_name: string; email: string; phone: string | null } | null
}

const STATUS_STYLE: Record<string, string> = {
  Requested: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("All")
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("appointments")
      .select("id, scheduled_at, status, reason, notes, patient:patient_id(full_name, email, phone)")
      .order("scheduled_at", { ascending: true })
    setAppointments((data as any) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: Appointment["status"]) => {
    setUpdatingId(id)
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id)
    if (!error) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    }
    setUpdatingId(null)
  }

  const filtered = filter === "All" ? appointments : appointments.filter((a) => a.status === filter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review requests and manage your patient schedule.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", "Requested", "Confirmed", "Completed", "Cancelled"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No {filter !== "All" ? filter.toLowerCase() : ""} appointments.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.patient?.full_name || "Unknown patient"}</p>
                    <Badge className={STATUS_STYLE[a.status]} variant="outline">{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.patient?.email}{a.patient?.phone ? ` · ${a.patient.phone}` : ""}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(a.scheduled_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {a.reason && <p className="text-sm text-muted-foreground">"{a.reason}"</p>}
                </div>

                <div className="flex items-center gap-2">
                  {updatingId === a.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      {a.status === "Requested" && (
                        <>
                          <button onClick={() => updateStatus(a.id, "Confirmed")} title="Confirm" className="rounded-full p-2 text-emerald-600 hover:bg-emerald-500/10">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => updateStatus(a.id, "Cancelled")} title="Reject" className="rounded-full p-2 text-red-600 hover:bg-red-500/10">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {a.status === "Confirmed" && (
                        <button onClick={() => updateStatus(a.id, "Completed")} title="Mark Completed" className="rounded-full p-2 text-blue-600 hover:bg-blue-500/10">
                          <CheckCheck className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
