import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { DashboardClientView } from "@/components/shared/DashboardClientView"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  // Fetch recent new alerts (both High and Critical)
  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('*, patients(mrn)')
    .eq('status', 'New')
    .in('severity', ['Critical', 'High'])
    .order('created_at', { ascending: false })
    .limit(8)

  // Quick stats
  const { count: totalPatients } = await supabase.from('patients').select('*', { count: 'exact', head: true })
  const { count: totalAlerts } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'New')
  const { count: totalDoctors } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'doctor')
  const { count: criticalAlerts } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'New').eq('severity', 'Critical')
  const { count: totalPredictions } = await supabase.from('predictions').select('*', { count: 'exact', head: true })

  return (
    <DashboardClientView 
      recentAlerts={recentAlerts || []}
      totalPatients={totalPatients || 0}
      totalAlerts={totalAlerts || 0}
      totalDoctors={totalDoctors || 0}
      criticalAlerts={criticalAlerts || 0}
      totalPredictions={totalPredictions || 0}
    />
  )
}
