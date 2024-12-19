import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'
import { userService } from '@/services/user.service'

// Remove any edge runtime declarations

export async function POST(req) {
  // Add response headers for CORS if needed
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const headersList = headers()
    const svix_id = headersList.get('svix-id')
    const svix_timestamp = headersList.get('svix-timestamp')
    const svix_signature = headersList.get('svix-signature')

    if (!WEBHOOK_SECRET) {
      throw new Error('CLERK_WEBHOOK_SECRET is not configured')
    }

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required Svix headers' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const payload = await req.text()
    const body = JSON.parse(payload)

    // Verify webhook
    const wh = new Webhook(WEBHOOK_SECRET)
    try {
      wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature
      })
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Process webhook
    const { data: eventData, type: eventType } = body
    const userId = eventData?.id

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'No user ID in webhook data' }),
        { status: 400, headers: corsHeaders }
      )
    }

    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const user = await userService.syncClerkUserToDatabase(userId)
        return new Response(
          JSON.stringify({ success: true, user }),
          { status: 200, headers: corsHeaders }
        )
      }
      case 'user.deleted': {
        await userService.deleteUserByClerkId(userId)
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: corsHeaders }
        )
      }
      default:
        return new Response(
          JSON.stringify({ message: 'Webhook received' }),
          { status: 200, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}