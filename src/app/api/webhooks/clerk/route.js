import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(req) {
  try {
    // Log incoming request details
    console.log('Webhook Request Received', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(headers()),
    })

    // Verify the webhook is coming from Clerk
    const headerPayload = headers()
    const svixId = headerPayload.get('svix-id')
    const svixTimestamp = headerPayload.get('svix-timestamp')
    const svixSignature = headerPayload.get('svix-signature')

    // Detailed logging for headers
    console.log('Svix Headers', {
      svixId,
      svixTimestamp,
      svixSignature
    })

    // If headers are missing, return a detailed error response
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing Svix headers')
      return NextResponse.json(
        { error: 'Missing Svix headers' }, 
        { status: 400 }
      )
    }

    // Get the raw body
    const payload = await req.text()
    console.log('Payload Received:', payload)

    // Create a new Svix Webhook instance with your webhook secret
    const webhook = new Webhook(process.env.WEBHOOK_SECRET)

    let event
    try {
      // Verify the webhook
      event = webhook.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature
      })
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook verification failed', details: err.message }, 
        { status: 400 }
      )
    }

    // Enhanced logging
    console.log('Webhook Event Processed', {
      type: event.type,
      userId: event.data.id
    })

    // Handle different Clerk webhook events
    const eventType = event.type
    const clerkUserId = event.data.id

    try {
      switch (eventType) {
        case 'user.created':
        case 'user.updated':
          await syncUserToPrisma(clerkUserId)
          break
        
        case 'user.deleted':
          await deleteUserFromPrisma(clerkUserId)
          break
        
        default:
          console.log('Unhandled event type:', eventType)
          return NextResponse.json(
            { message: 'Unhandled event type' }, 
            { status: 200 }
          )
      }

      return NextResponse.json(
        { message: 'Webhook processed successfully' }, 
        { status: 200 }
      )
    } catch (error) {
      console.error('Webhook processing error:', error)
      return NextResponse.json(
        { error: 'Error processing webhook', details: error.message }, 
        { status: 500 }
      )
    }
  } catch (globalError) {
    console.error('Global error in webhook handler:', globalError)
    return NextResponse.json(
      { error: 'Unexpected error', details: globalError.message }, 
      { status: 500 }
    )
  }
}

// Rest of the implementation remains the same as in previous response
export const config = {
  api: {
    bodyParser: false
  }
}