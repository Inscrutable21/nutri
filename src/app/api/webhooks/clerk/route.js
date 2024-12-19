// app/api/webhooks/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { userService } from '@/services/user.service'

export const runtime = 'edge'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

export async function POST(req) {
  try {
    // 1. Validate webhook headers
    const headersList = headers()
    const svix = {
      id: headersList.get('svix-id'),
      timestamp: headersList.get('svix-timestamp'),
      signature: headersList.get('svix-signature')
    }

    if (!svix.id || !svix.timestamp || !svix.signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required Svix headers' }),
        { status: 400 }
      )
    }

    // 2. Get and verify webhook payload
    const payload = await req.text()
    let event
    
    try {
      const wh = new Webhook(WEBHOOK_SECRET)
      event = wh.verify(payload, {
        'svix-id': svix.id,
        'svix-timestamp': svix.timestamp,
        'svix-signature': svix.signature
      })
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401 }
      )
    }

    // 3. Process the webhook event
    const { id: clerkUserId } = event.data
    const eventType = event.type

    if (!eventType || !clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Invalid event data' }),
        { status: 400 }
      )
    }

    // 4. Handle different webhook events
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const user = await userService.syncClerkUserToDatabase(clerkUserId)
        if (!user) {
          throw new Error('Failed to sync user data')
        }
        return new Response(
          JSON.stringify({ 
            message: 'User synchronized successfully',
            userId: user.id 
          }),
          { status: 200 }
        )
      }

      case 'user.deleted': {
        await userService.deleteUserByClerkId(clerkUserId)
        return new Response(
          JSON.stringify({ message: 'User deleted successfully' }),
          { status: 200 }
        )
      }

      default:
        return new Response(
          JSON.stringify({ message: 'Unhandled event type' }),
          { status: 200 }
        )
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500 }
    )
  }
}