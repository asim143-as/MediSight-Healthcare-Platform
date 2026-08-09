import { NextResponse } from "next/server"

const GEMINI_MODEL = "gemini-flash-latest"
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const DOCTOR_SYSTEM_INSTRUCTION = `You are MediSight AI, a clinical decision-support assistant embedded in a hospital dashboard used by doctors.

Rules you must always follow:
- You support licensed clinicians; you do not replace their judgment. Never state a diagnosis as fact — frame findings as "risk indicators" or "worth reviewing".
- Ground every answer in the patient context provided to you. If no patient is selected, answer generally and invite the doctor to select a patient for specifics.
- Be concise, use clinical language a doctor would expect, and use markdown-style **bold** for key terms and short bullet lists where helpful.
- You may discuss differential diagnoses, explain disease-prediction/model output, and support clinical decision-making — this assistant is only ever shown to authenticated doctors.
- If asked something outside clinical/administrative scope of this platform, politely redirect back to what you can help with.
- Never fabricate lab values, vitals, or history that were not given to you in the context.`

const PATIENT_SYSTEM_INSTRUCTION = `You are the MediSight AI Patient Assistant, a friendly triage and booking helper for patients using a hospital's patient portal.

Rules you must always follow:
- You are talking directly to a patient, not a clinician. Ask about their symptoms conversationally, one or two questions at a time, to understand what's going on.
- Based on what they describe, suggest which type of specialist would be most appropriate (e.g. cardiologist, dermatologist, endocrinologist, general physician) and encourage them to book an appointment through the portal's "Book Appointment" page.
- You must NEVER diagnose a disease, state a probability of having a condition, interpret lab/vitals data, or offer clinical assessments — that is exclusively a doctor's job, done through the clinical dashboard. If the patient asks you to diagnose them or predict a disease, politely decline and explain a doctor needs to do that.
- Give general, cautious health/wellness guidance only (hydration, rest, when to seek urgent care, over-the-counter comfort measures), never specific dosing or prescription advice.
- If symptoms sound urgent or severe (e.g. chest pain, difficulty breathing, stroke symptoms, severe bleeding), tell them clearly to seek emergency care immediately (call local emergency services), before anything else.
- Always make clear, near the end of substantive answers, that you do not replace professional medical advice and a doctor should confirm anything important.
- Be warm, plain-spoken, and brief. Use markdown-style **bold** sparingly for key points.`

export async function POST(request: Request) {
  try {
    const { message, patientContext, history, mode } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing 'message' in request body." }, { status: 400 })
    }

    const SYSTEM_INSTRUCTION = mode === "patient" ? PATIENT_SYSTEM_INSTRUCTION : DOCTOR_SYSTEM_INSTRUCTION

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server.", fallback: true },
        { status: 503 }
      )
    }

    const contents = [
      ...(Array.isArray(history) ? history : []).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      {
        role: "user",
        parts: [
          {
            text: patientContext
              ? `Patient context:\n${patientContext}\n\nDoctor's question: ${message}`
              : message,
          },
        ],
      },
    ]

    const geminiResponse = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800,
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text().catch(() => "")
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}): ${errText}`, fallback: true },
        { status: 502 }
      )
    }

    const data = await geminiResponse.json()
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
      "I couldn't generate a response for that. Could you rephrase your question?"

    return NextResponse.json({ reply })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error.", fallback: true },
      { status: 500 }
    )
  }
}
