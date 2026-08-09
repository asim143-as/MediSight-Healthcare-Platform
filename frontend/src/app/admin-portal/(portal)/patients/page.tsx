import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { AdminPatientsManager } from "@/components/shared/AdminPatientsManager"

export const dynamic = "force-dynamic"

export default async function AdminPortalPatientsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: patients } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .eq("role", "patient")
    .order("created_at", { ascending: false })

  return <AdminPatientsManager patients={patients || []} />
}
