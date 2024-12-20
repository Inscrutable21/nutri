// src/app/api/webhooks/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { userService } from '@/services/user.service'

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  // Debug: Log secret length and first few characters
  console.log('Webhook secret check:', {
    exists: !!WEBHOOK_SECRET,
    length: WEBHOOK_SECRET?.length,
    preview: WEBHOOK_SECRET ? `${WEBHOOK_SECRET.substring(0, 4)}...` : 'none'
  })

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

  // Debug: Log all request headers
  console.log('All headers received:', Object.fromEntries([...headersList.entries()]))

  // Debug: Detailed header logging
  console.log('Svix Headers:', {
    id: svix_id,
    timestamp: svix_timestamp,
    signature: svix_signature,
    idExists: !!svix_id,
    timestampExists: !!svix_timestamp,
    signatureExists: !!svix_signature
  })

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return Response.json(
      { 
        success: false,
        error: 'Missing required headers',
        received: {
          'svix-id': !!svix_id,
          'svix-timestamp': !!svix_timestamp,
          'svix-signature': !!svix_signature
        }
      },
      { status: 400 }
    )
  }

  try {
    const rawBody = await req.text()
    
    // Debug: Log body information
    console.log('Request body debug:', {
      length: rawBody.length,
      preview: rawBody.substring(0, 100),
      isJSON: (() => {
        try {
          JSON.parse(rawBody)
          return true
        } catch (e) {
          return false
        }
      })()
    })

    // Construct headers object for verification
    const svixHeaders = {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature
    }

    // Debug: Log verification attempt
    console.log('Attempting verification with:', {
      headersSent: svixHeaders,
      bodyLength: rawBody.length
    })

    try {
      const wh = new Webhook(WEBHOOK_SECRET)
      const payload = wh.verify(rawBody, svixHeaders)
      
      // Debug: Log successful verification
      console.log('Verification successful:', {
        eventType: payload.type,
        payloadPreview: JSON.stringify(payload).substring(0, 100)
      })

      const { type, data } = payload
      const userId = data?.id

      // Handle webhook events
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
          return Response.json({ 
            success: true,
            message: `Unhandled event type: ${type}`
          })
        }
      }
    } catch (verifyError) {
      // Debug: Log verification failure details
      console.error('Verification failed:', {
        error: verifyError.message,
        stack: verifyError.stack,
        headers: svixHeaders,
        bodyPreview: rawBody.substring(0, 100)
      })
      throw verifyError
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
        error: 'Invalid webhook signature',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 400 }
    )
  }
}