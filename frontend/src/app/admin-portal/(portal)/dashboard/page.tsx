import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Users, Stethoscope, Clock, Activity } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const [{ count: totalPatients }, { count: totalDoctors }, { count: pendingDoctors }, { count: totalAppointments }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "doctor"),
      supabase.from("doctors").select("user_id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("appointments").select("id", { count: "exact", head: true }),
    ])

  const stats = [
    { label: "Total Patients", value: totalPatients ?? 0, icon: Users, accent: "text-blue-500 bg-blue-500/10" },
    { label: "Total Doctors", value: totalDoctors ?? 0, icon: Stethoscope, accent: "text-emerald-500 bg-emerald-500/10" },
    { label: "Pending Approvals", value: pendingDoctors ?? 0, icon: Clock, accent: "text-amber-500 bg-amber-500/10" },
    { label: "Total Appointments", value: totalAppointments ?? 0, icon: Activity, accent: "text-violet-500 bg-violet-500/10" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">System-wide stats across doctors, patients, and appointments.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.accent}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {(pendingDoctors ?? 0) > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-sm font-semibold text-amber-600">
            {pendingDoctors} doctor{pendingDoctors === 1 ? "" : "s"} waiting for approval —{" "}
            <a href="/admin-portal/doctors" className="underline">review now</a>
          </p>
        </div>
      )}
    </div>
  )
}
