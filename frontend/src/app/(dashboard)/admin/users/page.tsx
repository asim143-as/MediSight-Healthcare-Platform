import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { UserManagementView } from "@/components/shared/UserManagementView"

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, hospitals(name)')
    .order('created_at', { ascending: false })

  const { data: hospitals } = await supabase
    .from('hospitals')
    .select('id, name')
    .order('name')

  return <UserManagementView profiles={profiles || []} hospitals={hospitals || []} />
}
