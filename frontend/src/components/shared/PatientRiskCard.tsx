"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RiskBadge, RiskSeverity } from "./RiskBadge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PatientRiskCardProps {
  disease: string
  probability: number
  confidence: number
  severity: RiskSeverity | string
  patientId: string
  predictionId: string
}

function getRecommendedDoctor(disease: string, severity: string) {
  const base = disease?.toLowerCase().includes("diabetes") ? "Endocrinologist" : "Primary Care Physician"
  if (severity === "Critical") return `${base} or Emergency Specialist`
  if (severity === "High") return `${base}`
  if (severity === "Moderate") return "Primary Care Physician"
  return "General Practitioner"
}

export function PatientRiskCard({ disease, probability, confidence, severity, patientId, predictionId }: PatientRiskCardProps) {
  const recommended = getRecommendedDoctor(disease, String(severity))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{disease} Risk</CardTitle>
            <CardDescription>Current Assessment</CardDescription>
          </div>
          <RiskBadge severity={severity} className="text-sm px-2 py-0.5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <div className="text-sm text-muted-foreground">Probability</div>
            <div className="text-2xl font-bold">{(probability * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Confidence</div>
            <div className="text-2xl font-medium">{(confidence * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/50 p-4 mt-6 text-sm">
          <div className="text-muted-foreground text-xs uppercase tracking-[0.18em] mb-2">Recommended Care</div>
          <p className="font-semibold">{recommended}</p>
        </div>

        <div className="mt-6">
          <Button asChild className="w-full" variant="outline">
            <Link href={`/patients/${patientId}/predictions/${predictionId}`}>
              View Explainability (SHAP)
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
