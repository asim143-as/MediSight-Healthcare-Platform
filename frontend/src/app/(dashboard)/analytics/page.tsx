import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { AnalyticsDashboard } from "@/components/shared/AnalyticsDashboard"

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  // Population-level predictions stats
  const { data: predictions, error: predErr } = await supabase
    .from('predictions')
    .select('disease, severity, probability, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (predErr) console.error("Analytics predictions error:", predErr)

  // Patient count per hospital — join hospitals table
  const { data: patientsByHospital, error: hospErr } = await supabase
    .from('patients')
    .select('hospital_id, hospitals!patients_hospital_id_fkey(name)')

  if (hospErr) console.error("Analytics hospital error:", hospErr)

  // Flatten hospitals relation (may be object or array depending on Supabase version)
  const flatPatients = (patientsByHospital || []).map((p: any) => ({
    hospital_id: p.hospital_id,
    hospitals: Array.isArray(p.hospitals) ? p.hospitals[0] : p.hospitals
  }))

  // Alert stats
  const { data: alertStats, error: alertErr } = await supabase
    .from('alerts')
    .select('severity, status, created_at')

  if (alertErr) console.error("Analytics alerts error:", alertErr)

  // Risk score distribution (30-day window)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentPredictions } = await supabase
    .from('predictions')
    .select('probability, severity, disease, created_at')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  return (
    <AnalyticsDashboard
      predictions={predictions || []}
      patientsByHospital={flatPatients}
      alertStats={alertStats || []}
      recentPredictions={recentPredictions || []}
    />
  )
}

