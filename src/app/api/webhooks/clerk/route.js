import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'

export async function POST(request) {
  try {
    // Log basic request information for debugging
    console.log('Webhook Request Received', {
      method: request.method,
      url: request.url,
    })

    // Extract Svix headers
    const headerPayload = headers()
    const svixId = headerPayload.get('svix-id')
    const svixTimestamp = headerPayload.get('svix-timestamp')
    const svixSignature = headerPayload.get('svix-signature')

    // Validate headers
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing Svix headers')
      return NextResponse.json(
        { error: 'Missing required Svix headers' }, 
        { status: 400 }
      )
    }

    // Get request body
    const payload = await request.text()

    // Basic webhook verification
    try {
      // Note: Ensure WEBHOOK_SECRET is correctly set in your .env
      const wh = new Webhook(process.env.WEBHOOK_SECRET)
      const evt = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature
      })

      // Log the event for debugging
      console.log('Verified Webhook Event:', evt)

      // Basic event handling
      return NextResponse.json({ 
        message: 'Webhook received successfully', 
        eventType: evt.type 
      }, { status: 200 })

    } catch (err) {
      console.error('Webhook verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook verification failed', details: err.message }, 
        { status: 400 }
      )
    }
  } catch (globalError) {
    console.error('Global webhook handler error:', globalError)
    return NextResponse.json(
      { error: 'Unexpected error', details: globalError.message }, 
      { status: 500 }
    )
  }
}

// Explicitly define allowed HTTP methods
export const config = {
  api: {
    bodyParser: false
  }
}