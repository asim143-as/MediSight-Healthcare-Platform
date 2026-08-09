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

    // Verify admin role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error("Forbidden: Admin access required")
    }

    // Call the FastAPI ML Service /retrain endpoint
    const mlServiceUrl = Deno.env.get('ML_SERVICE_URL') || 'http://host.docker.internal:8000'
    const mlResponse = await fetch(`${mlServiceUrl}/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!mlResponse.ok) {
      const errText = await mlResponse.text()
      throw new Error(`ML Service Error: ${errText}`)
    }

    const retrainData = await mlResponse.json()

    // Log the audit action using service role (admin action)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: 'trigger_retraining',
        table_name: 'model_registry',
        record_id: 'SYSTEM',
        old_data: {},
        new_data: { message: "Retraining triggered manually by admin" }
      })
    }

    return new Response(JSON.stringify(retrainData), {
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
