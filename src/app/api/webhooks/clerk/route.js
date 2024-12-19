// app/api/webhooks/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { userService } from '@/services/user.service'

export const runtime = 'edge'

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

export async function POST(req) {
  try {
    // 1. Get and validate webhook headers
    const headersList = headers()
    const svix_id = headersList.get('svix-id')
    const svix_timestamp = headersList.get('svix-timestamp')
    const svix_signature = headersList.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required Svix headers' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 2. Get the webhook body
    const payload = await req.text()
    const body = JSON.parse(payload)

    // 3. Verify webhook signature
    try {
      const wh = new Webhook(WEBHOOK_SECRET)
      wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature
      })
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid webhook signature',
          details: err.message 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 4. Process the webhook
    const { data: eventData, type: eventType } = body
    const userId = eventData?.id

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'No user ID in webhook data' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 5. Handle different webhook events
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const user = await userService.syncClerkUserToDatabase(userId)
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'User synchronized successfully',
            userId: user.id 
          }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      case 'user.deleted': {
        await userService.deleteUserByClerkId(userId)
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'User deleted successfully' 
          }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ message: 'Webhook received but no action taken' }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}