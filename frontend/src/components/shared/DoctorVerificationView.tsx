"use client"
import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Stethoscope } from "lucide-react"

interface DoctorRow {
  user_id: string
  license_number: string
  hospital: string | null
  specialization: string | null
  experience: number | null
  phone: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
  profile: { full_name: string; email: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
}

export function DoctorVerificationView({ doctors }: { doctors: DoctorRow[] }) {
  const [rows, setRows] = useState(doctors)
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleDecision = async (userId: string, status: "approved" | "rejected") => {
    setUpdatingId(userId)
    const { error } = await supabase.from("doctors").update({ status }).eq("user_id", userId)
    if (!error) {
      setRows((prev) => prev.map((r) => (r.user_id === userId ? { ...r, status } : r)))
    }
    setUpdatingId(null)
  }

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter)
  const pendingCount = rows.filter((r) => r.status === "pending").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Doctor Verification</h2>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{pendingCount} pending</Badge>
          )}
        </div>
        <div className="inline-flex rounded-xl border bg-muted/40 p-1">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          No {filter !== "all" ? filter : ""} doctor applications.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div key={d.user_id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{d.profile?.full_name || "Unnamed"}</p>
                    <Badge className={STATUS_STYLES[d.status]}>{d.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{d.profile?.email}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                    <div><span className="text-muted-foreground">License:</span> {d.license_number}</div>
                    <div><span className="text-muted-foreground">Hospital:</span> {d.hospital || "—"}</div>
                    <div><span className="text-muted-foreground">Specialization:</span> {d.specialization || "—"}</div>
                    <div><span className="text-muted-foreground">Experience:</span> {d.experience != null ? `${d.experience} yrs` : "—"}</div>
                  </div>
                </div>

                {d.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={updatingId === d.user_id}
                      onClick={() => handleDecision(d.user_id, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={updatingId === d.user_id}
                      onClick={() => handleDecision(d.user_id, "rejected")}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
