// src/app/api/webhooks/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

// Remove edge runtime as it's not compatible with current setup
// export const runtime = 'edge'

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
        // Inline the sync logic to avoid edge runtime issues
const clerkUser = await clerkClient.users.getUser(userId)
if (!clerkUser) {
  throw new Error(`No Clerk user found for ID: ${userId}`)
}

const primaryEmailObj = clerkUser.emailAddresses.find(
  email => email.id === clerkUser.primaryEmailAddressId
)

if (!primaryEmailObj?.emailAddress) {
  throw new Error('User must have a primary email address')
}

let addressData = null
if (clerkUser.primaryAddress) {
  addressData = {
    street: clerkUser.primaryAddress.street1 || null,
    city: clerkUser.primaryAddress.city || null,
    state: clerkUser.primaryAddress.state || null,
    country: clerkUser.primaryAddress.country || null,
    zipCode: clerkUser.primaryAddress.postalCode || null,
    pinCode: null
  }
}

const userData = {
  clerkUserId: clerkUser.id,
  email: primaryEmailObj.emailAddress,
  firstName: clerkUser.firstName || null,
  lastName: clerkUser.lastName || null,
  profilePicture: clerkUser.imageUrl || null,
  address: addressData,
  updatedAt: new Date()
}

const user = await prisma.user.upsert({
  where: { clerkUserId: userId },
  update: {
    ...userData,
    firstName: userData.firstName ?? undefined,
    lastName: userData.lastName ?? undefined,
    profilePicture: userData.profilePicture ?? undefined,
    address: addressData ?? undefined
  },
  create: userData
})
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