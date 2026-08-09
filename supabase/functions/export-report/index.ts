import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error("Unauthorized")
    }

    const { patient_id } = await req.json()
    if (!patient_id) {
      throw new Error("patient_id is required")
    }

    // Fetch patient data
    const { data: patient, error: patientError } = await supabaseClient
      .from('patients')
      .select('*, vitals(*), diagnoses(*)')
      .eq('id', patient_id)
      .single()

    if (patientError || !patient) {
      throw new Error("Patient not found or unauthorized")
    }

    // Generate a mock text report (in a real app, generate a PDF using a library like pdf-lib)
    const reportContent = `MediSight AI Clinical Report
===========================
Patient MRN: ${patient.mrn}
Generated Date: ${new Date().toISOString()}

Demographics:
${JSON.stringify(patient.demographics, null, 2)}

Latest Vitals:
${JSON.stringify(patient.vitals?.slice(0, 5), null, 2)}
    `

    // Upload to Supabase Storage
    const fileName = `report_${patient_id}_${Date.now()}.txt`
    const { error: uploadError } = await supabaseClient.storage
      .from('reports')
      .upload(fileName, new TextEncoder().encode(reportContent), {
        contentType: 'text/plain'
      })

    if (uploadError) {
      throw new Error(`Failed to upload report: ${uploadError.message}`)
    }

    // Get signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('reports')
      .createSignedUrl(fileName, 60 * 60) // 1 hour expiry

    if (signedUrlError) {
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`)
    }

    return new Response(JSON.stringify({ downloadUrl: signedUrlData.signedUrl }), {
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
