"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShapWaterfallChart, ShapFeature } from "@/components/shared/ShapWaterfallChart"
import { RiskBadge } from "@/components/shared/RiskBadge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PredictionDetailViewProps {
  prediction: any
  patient: any
  shapPayload: ShapFeature[]
  clinicalExplanation: string
  patientId: string
}

export function PredictionDetailView({
  prediction,
  patient,
  shapPayload,
  clinicalExplanation,
  patientId
}: PredictionDetailViewProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/patients/${patientId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Explainability (SHAP)</h1>
          <p className="text-muted-foreground">
            Patient: {patient?.demographics?.first_name} {patient?.demographics?.last_name} | MRN: {patient?.mrn}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Summary</CardTitle>
              <CardDescription>{prediction.disease} Risk</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Severity</span>
                <RiskBadge severity={prediction.severity} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Probability</div>
                <div className="text-3xl font-bold">{(prediction.probability * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Model Confidence</div>
                <div className="text-xl font-medium">{(prediction.confidence * 100).toFixed(1)}%</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinical Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {clinicalExplanation}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Top Contributing Factors</CardTitle>
              <CardDescription>
                SHAP values indicating how much each feature increased or decreased the predicted risk relative to the baseline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShapWaterfallChart data={shapPayload} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
