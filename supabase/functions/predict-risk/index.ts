import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"

// Default CDC BRFSS feature mapping
const DEFAULT_FEATURES = {
  HighBP: 0.0,
  HighChol: 0.0,
  CholCheck: 1.0,
  BMI: 25.0,
  Smoker: 0.0,
  Stroke: 0.0,
  HeartDiseaseorAttack: 0.0,
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
  Sex: 1.0, // Default male
  Age: 5.0,
  Education: 5.0,
  Income: 6.0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    // Initialize Supabase client acting on behalf of the user who invoked it
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error("Unauthorized")
    }

    const { patient_id, disease = 'Diabetes' } = await req.json()
    if (!patient_id) {
      throw new Error("patient_id is required")
    }

    // Fetch patient data from Supabase DB to construct ML payload
    // RLS will ensure the requesting doctor has access to this patient
    const { data: patient, error: patientError } = await supabaseClient
      .from('patients')
      .select('*, vitals(*), lab_results(*), diagnoses(*)')
      .eq('id', patient_id)
      .single()

    if (patientError || !patient) {
      throw new Error(`Patient not found or unauthorized: ${patientError?.message}`)
    }

    // Build feature vector for ML Service based on clinical patient data
    // In a real application, you would map patient history dynamically.
    // For this prototype, we'll map a few available properties and fall back to defaults.
    const mlPayload = { ...DEFAULT_FEATURES }
    
    // Map demographics
    if (patient.demographics) {
      mlPayload.Sex = patient.demographics.gender === 'Female' ? 0.0 : 1.0
      // Calculate age category (1-13 scale)
      if (patient.demographics.birth_date) {
        const age = new Date().getFullYear() - new Date(patient.demographics.birth_date).getFullYear()
        mlPayload.Age = Math.min(13, Math.max(1, Math.floor(age / 5)))
      }
    }

    // Map vitals
    if (patient.vitals && patient.vitals.length > 0) {
      const bmiVital = patient.vitals.find((v: any) => v.type === 'BMI')
      if (bmiVital) mlPayload.BMI = parseFloat(bmiVital.value)
      
      const sysBP = patient.vitals.find((v: any) => v.type === 'Blood Pressure Systolic')
      if (sysBP && parseFloat(sysBP.value) > 130) mlPayload.HighBP = 1.0
    }

    // Map diagnoses history
    if (patient.diagnoses && patient.diagnoses.length > 0) {
      const conditionStrings = patient.diagnoses.map((d: any) => d.condition.toLowerCase())
      if (conditionStrings.some((c: string) => c.includes('stroke'))) mlPayload.Stroke = 1.0
      if (conditionStrings.some((c: string) => c.includes('heart'))) mlPayload.HeartDiseaseorAttack = 1.0
    }

    // Call the FastAPI ML Service
    const mlServiceUrl = Deno.env.get('ML_SERVICE_URL') || 'http://host.docker.internal:8000'
    const mlResponse = await fetch(`${mlServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mlPayload)
    })

    if (!mlResponse.ok) {
      const errText = await mlResponse.text()
      throw new Error(`ML Service Error: ${errText}`)
    }

    const predictionData = await mlResponse.json()

    // Save the prediction to the database
    // Use service role key to insert prediction if RLS prevents normal insert, 
    // but typically RLS allows doctors to insert predictions for their patients.
    const { data: savedPrediction, error: insertError } = await supabaseClient
      .from('predictions')
      .insert({
        patient_id: patient_id,
        disease: disease,
        probability: predictionData.probability,
        confidence: predictionData.confidence,
        severity: predictionData.severity,
        model_version: predictionData.model_version
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to save prediction: ${insertError.message}`)
    }

    return new Response(JSON.stringify(savedPrediction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
