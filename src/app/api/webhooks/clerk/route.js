// src/app/api/webhooks/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { userService } from '@/services/user.service'

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    return Response.json(
      { 
        success: false,
        error: 'Missing webhook secret' 
      },
      { status: 500 }
    )
  }

  // Get the headers
  const headersList = headers()
  const svix_id = headersList.get("svix-id")
  const svix_timestamp = headersList.get("svix-timestamp")
  const svix_signature = headersList.get("svix-signature")

  // Debug logging
  console.log('Received webhook headers:', {
    'svix-id': svix_id,
    'svix-timestamp': svix_timestamp,
    'svix-signature': svix_signature?.substring(0, 20) + '...' // Log partial signature for debugging
  })

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return Response.json(
      { 
        success: false,
        error: 'Missing svix headers' 
      },
      { status: 400 }
    )
  }

  try {
    // Get the raw body as a string
    const rawBody = await req.text()
    
    // Debug logging
    console.log('Webhook raw body preview:', rawBody.substring(0, 100))

    // Create Webhook instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET)

    // Verify the webhook payload
    const payload = wh.verify(rawBody, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })

    // Parse the verified payload
    const { type, data } = payload
    const userId = data?.id

    console.log('Webhook verified successfully:', {
      type,
      userId,
      timestamp: new Date().toISOString()
    })

    if (!userId) {
      return Response.json(
        { 
          success: false,
          error: 'Missing user ID in webhook data' 
        },
        { status: 400 }
      )
    }

    // Handle different webhook events
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const user = await userService.syncClerkUserToDatabase(userId)
        return Response.json({ 
          success: true,
          user,
          event: type
        })
      }

      case 'user.deleted': {
        await userService.deleteUserByClerkId(userId)
        return Response.json({ 
          success: true,
          message: 'User deleted successfully',
          userId,
          event: type
        })
      }

      default: {
        return Response.json({ 
          success: true,
          message: `Unhandled event type: ${type}`
        })
      }
    }
  } catch (err) {
    // Enhanced error logging
    console.error('Webhook error:', {
      message: err.message,
      stack: err.stack,
      type: err.constructor.name
    })

    return Response.json(
      { 
        success: false,
        error: 'Invalid webhook signature'
      },
      { status: 400 }
    )
  }
}