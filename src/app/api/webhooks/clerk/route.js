// src/app/api/webhooks/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { userService } from '@/services/user.service'

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('Missing WEBHOOK_SECRET')
    return Response.json(
      { success: false, error: 'Webhook secret missing' },
      { status: 500 }
    )
  }

  // Get the headers
  const headersList = headers()
  const svix_id = headersList.get("svix-id")
  const svix_timestamp = headersList.get("svix-timestamp")
  const svix_signature = headersList.get("svix-signature")

  // Debug: Log headers
  console.log('Webhook headers:', {
    svix_id,
    svix_timestamp,
    svix_signature
  })

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return Response.json(
      { success: false, error: 'Missing required headers' },
      { status: 400 }
    )
  }

  try {
    const rawBody = await req.text()
    const svixHeaders = {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature
    }

    // Debug: Log payload attempt
    console.log('Attempting to verify webhook with body length:', rawBody.length)

    const wh = new Webhook(WEBHOOK_SECRET)
    const payload = wh.verify(rawBody, svixHeaders)

    console.log('Webhook payload verified:', {
      type: payload.type,
      userId: payload.data?.id
    })

    const { type, data } = payload
    const userId = data?.id

    if (!userId) {
      throw new Error('No user ID in webhook payload')
    }

    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const user = await userService.syncClerkUserToDatabase(userId)
        return Response.json({ success: true, user, event: type })
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
        console.log(`Unhandled webhook type: ${type}`)
        return Response.json({ 
          success: true,
          message: `Unhandled event type: ${type}`
        })
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    })

    return Response.json(
      { 
        success: false,
        error: 'Webhook processing failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 400 }
    )
  }
}