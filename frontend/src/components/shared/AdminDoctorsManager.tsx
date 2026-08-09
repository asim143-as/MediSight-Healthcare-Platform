"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Settings, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { AdminUserModal, type EditableUser } from "./AdminUserModal"

type DoctorRow = {
  user_id: string
  license_number: string | null
  hospital: string | null
  specialization: string | null
  experience: number | null
  phone: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
  profile: { full_name: string; email: string } | null
}

export function AdminDoctorsManager({ doctors }: { doctors: DoctorRow[] }) {
  const [rows, setRows] = useState(doctors)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<DoctorRow | null>(null)
  const supabase = createClient()

  const updateStatus = async (userId: string, status: "approved" | "rejected") => {
    setUpdatingId(userId)
    const { error } = await supabase.from("doctors").update({ status }).eq("user_id", userId)
    if (!error) {
      setRows((prev) => prev.map((d) => (d.user_id === userId ? { ...d, status } : d)))
    }
    setUpdatingId(null)
  }

  const statusColor = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Manage Doctors</h1>
        <p className="mt-1 text-sm text-muted-foreground">Approve pending sign-ups, edit profiles, reset passwords, or remove accounts.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-4 text-left font-medium text-muted-foreground">Doctor</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Specialty</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Hospital</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Status</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No doctors yet.</td></tr>
              ) : rows.map((d) => (
                <tr key={d.user_id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-4">
                    <p className="font-medium">{d.profile?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.profile?.email}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">{d.specialization || "—"}</td>
                  <td className="p-4 text-muted-foreground">{d.hospital || "—"}</td>
                  <td className="p-4">
                    <Badge className={statusColor[d.status]} variant="outline">{d.status}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {updatingId === d.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          {d.status !== "approved" && (
                            <button onClick={() => updateStatus(d.user_id, "approved")} title="Approve" className="rounded-full p-1.5 text-emerald-600 hover:bg-emerald-500/10">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {d.status !== "rejected" && (
                            <button onClick={() => updateStatus(d.user_id, "rejected")} title="Reject" className="rounded-full p-1.5 text-red-600 hover:bg-red-500/10">
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => setEditing(d)} title="Edit / Manage" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                            <Settings className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <AdminUserModal
          user={{
            id: editing.user_id,
            full_name: editing.profile?.full_name || "",
            email: editing.profile?.email || "",
            phone: editing.phone,
            specialty: editing.specialization,
          } as EditableUser}
          fields={[
            { key: "full_name", label: "Full Name" },
            { key: "email", label: "Email", type: "email" },
            { key: "phone", label: "Phone" },
            { key: "specialty", label: "Specialty" },
          ]}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((prev) => prev.map((d) => d.user_id === editing.user_id
              ? { ...d, specialization: updated.specialty ?? d.specialization, phone: updated.phone ?? d.phone, profile: { full_name: updated.full_name ?? d.profile?.full_name ?? "", email: updated.email ?? d.profile?.email ?? "" } }
              : d))
            setEditing(null)
          }}
          onDeleted={() => {
            setRows((prev) => prev.filter((d) => d.user_id !== editing.user_id))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
