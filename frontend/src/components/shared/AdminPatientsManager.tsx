"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import { AdminUserModal, type EditableUser } from "./AdminUserModal"

type PatientRow = {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string
}

export function AdminPatientsManager({ patients }: { patients: PatientRow[] }) {
  const [rows, setRows] = useState(patients)
  const [editing, setEditing] = useState<PatientRow | null>(null)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Manage Patients</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit patient profiles, reset passwords, or remove accounts.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-4 text-left font-medium text-muted-foreground">Patient</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Phone</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Joined</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No patients yet.</td></tr>
              ) : rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-4">
                    <p className="font-medium">{p.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">{p.phone || "—"}</td>
                  <td className="p-4 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <button onClick={() => setEditing(p)} title="Edit / Manage" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                      <Settings className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <AdminUserModal
          user={editing as EditableUser}
          fields={[
            { key: "full_name", label: "Full Name" },
            { key: "email", label: "Email", type: "email" },
            { key: "phone", label: "Phone" },
          ]}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...updated } as PatientRow : p))
            setEditing(null)
          }}
          onDeleted={() => {
            setRows((prev) => prev.filter((p) => p.id !== editing.id))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
