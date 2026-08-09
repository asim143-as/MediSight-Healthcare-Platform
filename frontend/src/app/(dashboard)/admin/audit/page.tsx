import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { AuditLogView } from "@/components/shared/AuditLogView"

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*, profiles(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(200)

  return <AuditLogView logs={auditLogs || []} />
}
