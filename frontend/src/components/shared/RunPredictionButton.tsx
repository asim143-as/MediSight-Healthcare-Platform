"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Zap } from "lucide-react"

interface RunPredictionButtonProps {
  patient: any
}

function buildMLPayload(patient: any) {
  const d = patient.demographics || {}
  const vitals = patient.vitals || []
  const diagnoses = patient.diagnoses || []

  const bmiVital = vitals.find((v: any) => v.type?.toLowerCase().includes("bmi"))
  const bpVital = vitals.find((v: any) => v.type?.toLowerCase().includes("systolic") || v.type?.toLowerCase().includes("blood pressure"))

  const bmiNum = bmiVital ? parseFloat(bmiVital.value) || 25 : 25
  const bpNum = bpVital ? parseInt(bpVital.value) || 120 : 120
  const ageNum = d.age || (
    (d.birth_date || d.dob)
      ? Math.floor((Date.now() - new Date(d.birth_date || d.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 40
  )
  const ageGroup = Math.min(13, Math.max(1, Math.ceil(ageNum / 10)))
  const hasHeart = diagnoses.some((dx: any) => dx.condition?.toLowerCase().includes("heart"))
  const hasStroke = diagnoses.some((dx: any) => dx.condition?.toLowerCase().includes("stroke"))

  return {
    HighBP: bpNum >= 130 ? 1.0 : 0.0,
    HighChol: 0.0,
    CholCheck: 1.0,
    BMI: bmiNum,
    Smoker: 0.0,
    Stroke: hasStroke ? 1.0 : 0.0,
    HeartDiseaseorAttack: hasHeart ? 1.0 : 0.0,
    PhysActivity: 1.0,
    Fruits: 1.0,
    Veggies: 1.0,
    HvyAlcoholConsump: 0.0,
    AnyHealthcare: 1.0,
    NoDocbcCost: 0.0,
    GenHlth: 3.0,
    MentHlth: 0.0,
    PhysHlth: 0.0,
    DiffWalk: 0.0,
    Sex: (d.gender || "").toLowerCase() === "male" ? 1.0 : 0.0,
    Age: ageGroup,
    Education: 5.0,
    Income: 6.0,
  }
}

export function RunPredictionButton({ patient }: RunPredictionButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleRunPrediction = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const mlPayload = buildMLPayload(patient)

      const mlRes = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mlPayload),
      })

      if (!mlRes.ok) {
        throw new Error("Prediction request failed")
      }

      const prediction = await mlRes.json()

      const { error: predErr } = await supabase.from("predictions").insert({
        patient_id: patient.id,
        disease: prediction.disease || "Diabetes",
        probability: prediction.probability,
        severity: prediction.severity,
        confidence: prediction.confidence,
        model_version: prediction.model_version,
      })

      if (predErr) throw new Error(`Save error: ${predErr.message}`)

      if (prediction.severity === "High" || prediction.severity === "Critical") {
        await supabase.from("alerts").insert({
          patient_id: patient.id,
          type: `${prediction.severity} Diabetes Risk`,
          severity: prediction.severity,
          status: "New",
        })
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message || "Prediction failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRunPrediction}
        disabled={loading}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running AI Model...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Run AI Prediction
          </>
        )}
      </button>
      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
