import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { DeviceFingerprint, AuthorizedDevice, DeviceAuthorizationRequest } from './types.ts'

interface RequestBody {
  userId: string
  fingerprint: DeviceFingerprint
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { userId, fingerprint } = await req.json() as RequestBody

    if (!userId || !fingerprint) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Get user's authorized devices
    const { data: authorizedDevices, error: devicesError } = await supabaseClient
      .from('authorized_devices')
      .select('*')
      .eq('user_id', userId)

    if (devicesError) {
      console.error('Error fetching authorized devices:', devicesError)
      return new Response(
        JSON.stringify({ error: 'Error checking device authorization' }),
        { 
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Check if device is already authorized
    const isAuthorized = authorizedDevices?.some((device: AuthorizedDevice) => 
      device.browser === fingerprint.browser &&
      device.os === fingerprint.os &&
      device.device === fingerprint.device
    )

    if (isAuthorized) {
      return new Response(
        JSON.stringify({ isAuthorized: true }),
        { 
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // If device is not authorized, create an authorization request
    const { data: request, error: requestError } = await supabaseClient
      .from('device_authorization_requests')
      .insert({
        user_id: userId,
        browser: fingerprint.browser,
        os: fingerprint.os,
        device: fingerprint.device,
        timestamp: fingerprint.timestamp,
        requested_at: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating authorization request:', requestError)
      return new Response(
        JSON.stringify({ error: 'Error creating authorization request' }),
        { 
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    return new Response(
      JSON.stringify({
        isAuthorized: false,
        requestId: request.id,
        message: 'Device authorization request created'
      }),
      { 
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
}) 