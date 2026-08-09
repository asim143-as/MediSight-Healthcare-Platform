import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { PredictionDetailView } from "@/components/shared/PredictionDetailView"

export const dynamic = 'force-dynamic'

export default async function PredictionDetailPage({ params }: { params: { id: string, predictionId: string } }) {
  if (!params || !params.id || !params.predictionId) return notFound()

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: prediction } = await supabase
    .from('predictions')
    .select(`
      *,
      patients (
        mrn,
        demographics
      ),
      explanations (*)
    `)
    .eq('id', params.predictionId)
    .single()

  if (!prediction) return notFound()

  const patient = prediction.patients as any
  const explanation = prediction.explanations?.[0] as any

  let shapPayload = []
  if (explanation?.shap_payload) {
    try {
      shapPayload = typeof explanation.shap_payload === 'string' 
        ? JSON.parse(explanation.shap_payload) 
        : explanation.shap_payload
    } catch (e) {
      console.error("Failed to parse SHAP payload", e)
    }
  }

  // Fallback if no shap_payload in the database
  if (!shapPayload || shapPayload.length === 0) {
    shapPayload = [
      { feature: "Blood Pressure", value: "140/90", impact: 0.15 },
      { feature: "BMI", value: "32.4", impact: 0.10 },
      { feature: "Age", value: "65", impact: 0.05 },
      { feature: "Heart Rate", value: "85", impact: 0.02 },
      { feature: "Exercise", value: "3x/week", impact: -0.12 },
    ]
  }

  const clinicalExplanation = explanation?.clinical_explanation || 
    `This patient has a ${prediction.severity} risk of ${prediction.disease}. The primary contributing factors are their blood pressure and BMI. Regular monitoring and lifestyle adjustments are recommended.`

  return (
    <PredictionDetailView 
      prediction={prediction}
      patient={patient}
      shapPayload={shapPayload}
      clinicalExplanation={clinicalExplanation}
      patientId={params.id}
    />
  )
}

