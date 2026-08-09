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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Verify caller has a valid JWT
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error("Unauthorized")
    }

    // Verify caller is an admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error("Forbidden: Admin access required")
    }

    const { email, role = 'doctor' } = await req.json()
    if (!email) {
      throw new Error("Email is required")
    }

    // Use service role to invite user
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (inviteError) {
      throw new Error(`Failed to invite user: ${inviteError.message}`)
    }

    // Create profile record for the invited user
    if (inviteData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: inviteData.user.id,
          first_name: 'Pending',
          last_name: 'Invite',
          role: role,
          department: 'General'
        })
      
      if (profileError) {
        console.error("Failed to create profile for invited user", profileError)
      }
    }

    return new Response(JSON.stringify({ success: true, user: inviteData.user }), {
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
