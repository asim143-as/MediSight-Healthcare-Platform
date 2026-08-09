import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ModelRegistryView } from "@/components/shared/ModelRegistryView"

export const dynamic = 'force-dynamic'

export default async function AdminModelsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: models } = await supabase
    .from('model_registry')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch live model status from FastAPI
  let liveStatus: any = null
  try {
    const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'
    const res = await fetch(`${ML_URL}/model-status`, { 
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) liveStatus = await res.json()
  } catch (e) {
    // ML service offline - degrade gracefully
  }

  return <ModelRegistryView models={models || []} liveStatus={liveStatus} />
}
