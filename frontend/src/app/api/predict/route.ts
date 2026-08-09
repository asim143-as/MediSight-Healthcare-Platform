import { NextResponse } from "next/server"

function buildFallbackPrediction(payload: Record<string, any>) {
  const bp = Number(payload.HighBP) || 0
  const bmi = Number(payload.BMI) || 25
  const smoker = Number(payload.Smoker) || 0
  const stroke = Number(payload.Stroke) || 0
  const heart = Number(payload.HeartDiseaseorAttack) || 0
  const active = Number(payload.PhysActivity) || 1
  const age = Number(payload.Age) || 40

  let score = 0.16
  score += bp * 0.22
  score += bmi > 30 ? 0.2 : 0.08
  score += smoker * 0.16
  score += stroke * 0.12
  score += heart * 0.14
  score += active === 0 ? 0.1 : 0
  score += age > 50 ? 0.12 : 0.04

  const probability = Math.min(0.97, Math.max(0.08, score))
  const severity = probability > 0.8 ? "Critical" : probability > 0.6 ? "High" : probability > 0.35 ? "Moderate" : "Low"

  return {
    disease: "Diabetes",
    probability: Number(probability.toFixed(3)),
    severity,
    confidence: 0.78,
    model_version: "fallback-heuristic-v1",
  }
}

export async function POST(request: Request) {
  let payload: Record<string, any> = {}

  try {
    payload = await request.json()
    const upstreamBase = process.env.ML_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const targetUrl = `${upstreamBase.replace(/\/$/, "")}/predict`

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
  } catch {
    // fall back to a local heuristic prediction if the ML service is unavailable
  }

  return NextResponse.json(buildFallbackPrediction(payload))
}
