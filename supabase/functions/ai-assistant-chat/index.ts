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

    const { patient_id, message } = await req.json()
    if (!message) {
      throw new Error("Message is required")
    }

    let patientContextText = "No patient context provided."
    if (patient_id) {
      // Fetch patient context
      const { data: patient } = await supabaseClient
        .from('patients')
        .select('*, vitals(*), diagnoses(*)')
        .eq('id', patient_id)
        .single()
      
      if (patient) {
        patientContextText = `Patient ID: ${patient_id}\n`
        patientContextText += `Demographics: ${JSON.stringify(patient.demographics)}\n`
        if (patient.vitals) {
          patientContextText += `Latest Vitals: ${JSON.stringify(patient.vitals.slice(0, 5))}\n`
        }
      }
    }

    // Prepare system prompt preventing hallucinations and providing context
    const systemPrompt = `You are MediSight AI, a clinical decision support assistant.
    You must NOT diagnose or prescribe treatment. Provide analytical insights based on the provided data.
    
    CONTEXT:
    ${patientContextText}
    `

    // Call OpenAI compatible API (OpenAI, Groq, etc.)
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    const apiBaseUrl = Deno.env.get('OPENAI_API_BASE_URL') || 'https://api.openai.com/v1'
    const modelId = Deno.env.get('AI_MODEL_ID') || 'gpt-4o-mini'

    if (!apiKey) {
      throw new Error("AI API Key is not configured")
    }

    const aiResponse = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.2
      })
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      throw new Error(`AI API Error: ${errText}`)
    }

    const aiData = await aiResponse.json()
    const reply = aiData.choices[0].message.content

    // Optional: Log interaction to ai_messages
    if (patient_id) {
      await supabaseClient.from('ai_messages').insert([
        { user_id: user.id, patient_id: patient_id, role: 'user', content: message },
        { user_id: user.id, patient_id: patient_id, role: 'assistant', content: reply }
      ])
    }

    return new Response(JSON.stringify({ reply }), {
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
