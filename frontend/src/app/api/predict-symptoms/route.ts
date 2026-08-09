import { NextResponse } from "next/server"

/**
 * Lightweight rule-based symptom screening engine.
 *
 * NOTE: This is a heuristic symptom-checker used for the "Disease Prediction Wizard"
 * intake flow. It is intentionally separate from the trained LightGBM diabetes model
 * (see /api/predict) which operates on structured clinical features, not free symptoms.
 * This engine exists to give patients a fast triage signal + doctor recommendation.
 * It must never be presented as a diagnosis.
 */

type DiseaseProfile = {
  disease: string
  specialty: string
  symptoms: Record<string, number> // symptom id -> weight
  recommendations: string[]
}

const DISEASE_PROFILES: DiseaseProfile[] = [
  {
    disease: "Influenza (Flu)",
    specialty: "General Practitioner",
    symptoms: { fever: 3, cough: 2, fatigue: 2, headache: 1, body_ache: 3, chills: 2, sore_throat: 1, runny_nose: 1 },
    recommendations: [
      "Rest and stay well hydrated",
      "Monitor temperature every few hours",
      "Use over-the-counter fever reducers as directed",
      "Seek care if breathing becomes difficult or fever exceeds 39.5°C",
    ],
  },
  {
    disease: "Pneumonia",
    specialty: "General Practitioner",
    symptoms: { fever: 2, cough: 3, chest_pain: 3, shortness_of_breath: 3, fatigue: 2, chills: 1 },
    recommendations: [
      "Seek in-person evaluation promptly — chest imaging may be needed",
      "Monitor oxygen levels if a pulse oximeter is available",
      "Avoid exertion until assessed by a physician",
      "Go to emergency care if lips/fingertips turn bluish or breathing is severe",
    ],
  },
  {
    disease: "Migraine",
    specialty: "General Practitioner",
    symptoms: { headache: 3, nausea: 2, dizziness: 2, blurred_vision: 2, sensitivity_to_light: 3, fatigue: 1 },
    recommendations: [
      "Rest in a quiet, dark room",
      "Track triggers (sleep, food, stress) in a headache diary",
      "Stay hydrated and avoid skipping meals",
      "Consult a doctor if headaches are new, severe, or accompanied by vision loss",
    ],
  },
  {
    disease: "Coronary Heart Disease",
    specialty: "Cardiologist",
    symptoms: { chest_pain: 3, shortness_of_breath: 2, fatigue: 2, dizziness: 2, palpitations: 3, swelling_legs: 2 },
    recommendations: [
      "Seek urgent evaluation if chest pain is severe, radiating, or with sweating",
      "Avoid strenuous activity until cleared by a cardiologist",
      "Track blood pressure and pulse if possible",
      "Call emergency services immediately for crushing chest pain or fainting",
    ],
  },
  {
    disease: "Hypertension-Related Risk",
    specialty: "Cardiologist",
    symptoms: { headache: 2, dizziness: 2, blurred_vision: 2, chest_pain: 1, fatigue: 1, nosebleed: 2 },
    recommendations: [
      "Get blood pressure checked as soon as possible",
      "Reduce salt intake and monitor stress levels",
      "Avoid stimulants like excess caffeine until evaluated",
      "Seek urgent care for BP readings above 180/120 with symptoms",
    ],
  },
  {
    disease: "Type 2 Diabetes Risk",
    specialty: "Endocrinologist",
    symptoms: { frequent_urination: 3, excessive_thirst: 3, fatigue: 2, blurred_vision: 2, slow_healing: 2, weight_loss: 2 },
    recommendations: [
      "Request a fasting blood glucose or HbA1c test",
      "Monitor fluid intake and urination frequency",
      "Maintain a balanced, low-sugar diet in the meantime",
      "Seek prompt care if experiencing confusion or rapid breathing",
    ],
  },
  {
    disease: "Chronic Kidney Disease Risk",
    specialty: "Nephrologist",
    symptoms: { swelling_legs: 3, fatigue: 2, frequent_urination: 2, nausea: 2, back_pain: 1, blood_in_urine: 3 },
    recommendations: [
      "Request kidney function tests (creatinine, eGFR)",
      "Monitor fluid retention and urine changes",
      "Limit sodium and protein intake until evaluated",
      "Seek urgent care for minimal or no urination",
    ],
  },
  {
    disease: "Acute Gastroenteritis (Food Poisoning)",
    specialty: "General Practitioner",
    symptoms: { nausea: 3, vomiting: 3, diarrhea: 3, abdominal_pain: 2, fever: 1, fatigue: 1 },
    recommendations: [
      "Stay hydrated with oral rehydration solutions",
      "Eat bland foods once vomiting subsides",
      "Avoid dairy and fatty foods for 24–48 hours",
      "Seek care if unable to keep fluids down or signs of severe dehydration appear",
    ],
  },
]

const ALL_SYMPTOMS = Array.from(
  new Set(DISEASE_PROFILES.flatMap((d) => Object.keys(d.symptoms)))
)

export async function GET() {
  return NextResponse.json({ symptoms: ALL_SYMPTOMS })
}

export async function POST(request: Request) {
  try {
    const { symptoms } = await request.json()

    if (!Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json({ error: "Please select at least one symptom." }, { status: 400 })
    }

    const selected = new Set(symptoms as string[])

    const scored = DISEASE_PROFILES.map((profile) => {
      const maxPossible = Object.values(profile.symptoms).reduce((a, b) => a + b, 0)
      let matched = 0
      let matchedCount = 0
      for (const s of selected) {
        if (profile.symptoms[s]) {
          matched += profile.symptoms[s]
          matchedCount += 1
        }
      }
      const coverage = matchedCount / Object.keys(profile.symptoms).length
      const weightScore = maxPossible > 0 ? matched / maxPossible : 0
      const confidence = Math.min(0.97, weightScore * 0.7 + coverage * 0.3)
      return { profile, confidence, matchedCount }
    })
      .filter((s) => s.matchedCount > 0)
      .sort((a, b) => b.confidence - a.confidence)

    if (scored.length === 0) {
      return NextResponse.json({
        disease: "Non-specific symptoms",
        specialty: "General Practitioner",
        confidence: 0.35,
        risk: "Low",
        recommendations: [
          "Monitor your symptoms over the next 24-48 hours",
          "Stay hydrated and rest",
          "Consult a general practitioner if symptoms persist or worsen",
        ],
      })
    }

    const top = scored[0]
    const confidencePct = Math.round(top.confidence * 100)
    const risk =
      confidencePct >= 80 ? "Critical" : confidencePct >= 60 ? "High" : confidencePct >= 35 ? "Moderate" : "Low"

    return NextResponse.json({
      disease: top.profile.disease,
      specialty: top.profile.specialty,
      confidence: confidencePct,
      risk,
      recommendations: top.profile.recommendations,
      alternatives: scored.slice(1, 3).map((s) => ({
        disease: s.profile.disease,
        confidence: Math.round(s.confidence * 100),
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected server error." }, { status: 500 })
  }
}
