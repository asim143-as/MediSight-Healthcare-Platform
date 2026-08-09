import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

serve(async (req) => {
  try {
    // Webhooks should be authenticated with the service role key
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      throw new Error("Unauthorized Webhook Call")
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey!)

    const payload = await req.json()
    // Payload from pg_net webhook usually contains { type, record, schema, table }
    // Or if custom payload: { prediction_id, patient_id }
    
    const prediction_id = payload.record?.id || payload.prediction_id
    const patient_id = payload.record?.patient_id || payload.patient_id
    
    if (!prediction_id || !patient_id) {
      throw new Error("Invalid payload missing prediction_id or patient_id")
    }

    // Insert alert into alerts table
    const { error } = await supabaseAdmin
      .from('alerts')
      .insert({
        patient_id: patient_id,
        type: 'Critical Prediction',
        severity: 'Critical',
        status: 'Unacknowledged'
      })

    if (error) throw error

    // In a real application, trigger Email, SMS, or Push Notification here.
    console.log(`Alert created for patient ${patient_id} (Prediction: ${prediction_id})`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
