import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(req) {
  // Verify the webhook is coming from Clerk
  const headerPayload = headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  // If headers are missing, return an error
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Error: Missing Svix headers', { status: 400 })
  }

  // Get the raw body
  const payload = await req.text()

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
    return new Response('Error: Webhook verification failed', { status: 400 })
  }

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
    }

    return new Response('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}

// Function to sync Clerk user to Prisma
async function syncUserToPrisma(clerkUserId) {
  try {
    // Fetch user from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkUserId)

    // Prepare user data
    const userData = {
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      profilePicture: clerkUser.imageUrl || '',
      
      // Optional: Add address if available
      ...(clerkUser.primaryAddress && {
        address: {
          street: clerkUser.primaryAddress.street || '',
          city: clerkUser.primaryAddress.city || '',
          state: clerkUser.primaryAddress.state || '',
          country: clerkUser.primaryAddress.country || '',
          zipCode: clerkUser.primaryAddress.postalCode || '',
          pinCode: clerkUser.primaryAddress.postalCode || ''
        }
      })
    }

    // Upsert user in Prisma database
    await prisma.user.upsert({
      where: { clerkUserId: clerkUserId },
      update: {
        ...userData,
        // Prevent overwriting with empty values
        email: userData.email || undefined,
        firstName: userData.firstName || undefined,
        lastName: userData.lastName || undefined,
        profilePicture: userData.profilePicture || undefined,
      },
      create: userData
    })

    console.log(`User ${clerkUserId} synced successfully`)
  } catch (error) {
    console.error(`Error syncing user ${clerkUserId}:`, error)
    throw error
  }
}

// Function to delete user from Prisma when deleted in Clerk
async function deleteUserFromPrisma(clerkUserId) {
  try {
    await prisma.user.delete({
      where: { clerkUserId: clerkUserId }
    })
    console.log(`User ${clerkUserId} deleted successfully`)
  } catch (error) {
    console.error(`Error deleting user ${clerkUserId}:`, error)
    throw error
  }
}

// Ensure the route only accepts POST requests
export const config = {
  api: {
    bodyParser: false
  }
}