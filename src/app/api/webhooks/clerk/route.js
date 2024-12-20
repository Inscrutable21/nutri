// src/app/api/webhooks/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { userService } from '@/services/user.service'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

async function validateRequest(req) {
  const headersList = headers();
  const svixHeaders = {
    'svix-id': headersList.get('svix-id'),
    'svix-timestamp': headersList.get('svix-timestamp'),
    'svix-signature': headersList.get('svix-signature'),
  }

  // Ensure all required headers are present
  if (!svixHeaders['svix-id'] || !svixHeaders['svix-timestamp'] || !svixHeaders['svix-signature']) {
    throw new Error('Missing required Svix headers')
  }

  const payload = await req.text()
  const webhook = new Webhook(webhookSecret)
  
  try {
    return {
      // Verify the payload and get the webhook body
      body: webhook.verify(payload, svixHeaders),
      // Return the raw payload in case we need it
      rawPayload: payload
    }
  } catch (err) {
    console.error('Webhook verification failed:', {
      headers: svixHeaders,
      error: err.message,
      // Log partial payload for debugging (be careful with sensitive data)
      payloadPreview: payload.substring(0, 100)
    })
    throw new Error('Invalid webhook signature')
  }
}

export async function POST(req) {
  try {
    if (!webhookSecret) {
      throw new Error('Missing CLERK_WEBHOOK_SECRET environment variable')
    }

    const { body } = await validateRequest(req)
    const { type: eventType, data: eventData } = body

    // Log incoming webhook event
    console.log('Processing webhook event:', {
      type: eventType,
      userId: eventData?.id,
      timestamp: new Date().toISOString()
    })

    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const user = await userService.syncClerkUserToDatabase(eventData.id)
        return Response.json({ 
          success: true, 
          user,
          event: eventType
        })
      }

      case 'user.deleted': {
        await userService.deleteUserByClerkId(eventData.id)
        return Response.json({ 
          success: true,
          userId: eventData.id,
          event: eventType
        })
      }

      default: {
        // Log unhandled event types
        console.log('Unhandled webhook event type:', eventType)
        return Response.json({ 
          success: true,
          message: `Unhandled event type: ${eventType}`
        })
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', {
      message: error.message,
      stack: error.stack
    })

    // Determine appropriate status code
    const statusCode = error.message.includes('Missing required Svix headers') || 
                      error.message.includes('Invalid webhook signature') ? 
                      400 : 500

    return Response.json(
      { 
        success: false,
        error: error.message 
      },
      { status: statusCode }
    )
  }
}