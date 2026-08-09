import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { MLOpsView } from "@/components/shared/MLOpsView"

export const dynamic = 'force-dynamic'

export default async function AdminMLOpsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  // Attempt to connect to FastAPI ML service
  let driftData: any = null
  let modelStatus: any = null
  let serviceConnected = false
  const ML_URL = process.env.ML_SERVICE_URL || process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000'

  try {
    const [driftRes, statusRes] = await Promise.allSettled([
      fetch(`${ML_URL}/drift-status`, { cache: 'no-store', signal: AbortSignal.timeout(4000) }),
      fetch(`${ML_URL}/model-status`, { cache: 'no-store', signal: AbortSignal.timeout(4000) })
    ])
    if (driftRes.status === 'fulfilled' && driftRes.value.ok) {
      driftData = await driftRes.value.json()
      serviceConnected = true
    }
    if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
      modelStatus = await statusRes.value.json()
      serviceConnected = true
    }
  } catch (e) {
    // FastAPI not running — provide demo fallback so page is still informative
  }

  // Fallback demo data when FastAPI is offline
  if (!modelStatus) {
    modelStatus = {
      _demo: true,            // flag used by MLOpsView to show "Not Connected" notice
      status: 'idle',
      version: '1.0.0',
      last_trained: null,
      accuracy: null,
    }
  }

  // Prediction volume trend from Supabase (always available)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: predictionTrend } = await supabase
    .from('predictions')
    .select('created_at, severity, probability')
    .gte('created_at', twoWeeksAgo)
    .order('created_at', { ascending: true })

  return (
    <MLOpsView
      driftData={driftData}
      modelStatus={modelStatus}
      predictionTrend={predictionTrend || []}
      serviceConnected={serviceConnected}
      mlServiceUrl={ML_URL}
    />
  )
}

