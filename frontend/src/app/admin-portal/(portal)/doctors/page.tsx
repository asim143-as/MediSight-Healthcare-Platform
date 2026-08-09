import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { AdminDoctorsManager } from "@/components/shared/AdminDoctorsManager"

export const dynamic = "force-dynamic"

export default async function AdminPortalDoctorsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: doctors } = await supabase
    .from("doctors")
    .select("user_id, license_number, hospital, specialization, experience, phone, status, created_at, profile:user_id(full_name, email)")
    .order("created_at", { ascending: false })

  return <AdminDoctorsManager doctors={(doctors as any) || []} />
}
