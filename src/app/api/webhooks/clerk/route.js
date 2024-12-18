import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(req) {
  // Log the entire request for debugging
  console.log('Webhook Received: Starting Processing')

  // Verify the webhook is coming from Clerk
  const headerPayload = headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  // Log headers for debugging
  console.log('Svix Headers:', {
    svixId,
    svixTimestamp,
    svixSignature
  })

  // If headers are missing, return an error
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing Svix headers')
    return new Response('Error: Missing Svix headers', { status: 400 })
  }

  // Get the raw body
  const payload = await req.text()
  console.log('Webhook Payload:', payload)

  // Create a new Svix Webhook instance with your webhook secret
  let webhook;
  try {
    webhook = new Webhook(process.env.WEBHOOK_SECRET)
  } catch (err) {
    console.error('Failed to create Svix Webhook instance:', err)
    return new Response('Error: Failed to create webhook', { status: 500 })
  }

  let event
  try {
    // Verify the webhook
    event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature
    })
    console.log('Webhook Verified Successfully')
  } catch (err) {
    console.error('Webhook verification failed:', err)
    //return new Response('Error: Webhook verification failed', { status: 400 })
  }

  // Handle different Clerk webhook events
  const eventType = event.type
  const clerkUserId = event.data.id

  console.log('Webhook Event Details:', {
    eventType,
    clerkUserId
  })

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
        return new Response('Unhandled event type', { status: 200 })
    }

    return new Response('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Comprehensive Webhook processing error:', {
      message: error.message,
      stack: error.stack,
      eventType,
      clerkUserId
    })
    return new Response('Error processing webhook', { status: 500 })
  }
}

// Function to sync Clerk user to Prisma with comprehensive error handling
async function syncUserToPrisma(clerkUserId) {
  console.log(`Starting sync for user: ${clerkUserId}`)
  
  if (!clerkUserId) {
    console.warn('No Clerk User ID provided for sync')
    return null
  }

  try {
    // Fetch user from Clerk with comprehensive error handling
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(clerkUserId)
      console.log('Clerk User Fetched:', {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress
      })
    } catch (clerkFetchError) {
      console.error('Failed to fetch Clerk user', {
        clerkUserId,
        errorMessage: clerkFetchError.message,
        errorStack: clerkFetchError.stack
      })
      return null
    }

    // Validate Clerk user
    if (!clerkUser) {
      console.warn(`No Clerk user found for ID: ${clerkUserId}`)
      return null
    }

    // Comprehensive user data preparation
    const userData = {
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      profilePicture: clerkUser.imageUrl || '',
      
      // Comprehensive metadata collection
      metadata: {
        phoneNumbers: clerkUser.phoneNumbers?.map(phone => phone.phoneNumber) || [],
        primaryWeb3Wallet: clerkUser.web3Wallets?.[0]?.web3Wallet || null,
        verifiedExternalAccounts: clerkUser.externalAccounts?.map(account => ({
          provider: account.provider,
          identifier: account.identification?.[0]?.identifier
        })) || []
      },

      // Optional address details with fallback
      ...(clerkUser.primaryAddress && {
        address: {
          street: clerkUser.primaryAddress.street || '',
          city: clerkUser.primaryAddress.city || '',
          state: clerkUser.primaryAddress.state || '',
          country: clerkUser.primaryAddress.country || '',
          zipCode: clerkUser.primaryAddress.postalCode || '',
        }
      })
    }

    // Upsert user in the database with comprehensive logging
    const user = await prisma.user.upsert({
      where: { 
        clerkUserId: clerkUserId 
      },
      update: {
        ...userData,
        // Prevent overwriting with empty values
        email: userData.email || undefined,
        firstName: userData.firstName || undefined,
        lastName: userData.lastName || undefined,
        profilePicture: userData.profilePicture || undefined,
      },
      create: userData,
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true
      }
    })

    console.log('User Sync Completed Successfully', {
      clerkUserId: user.clerkUserId,
      email: user.email,
      prismaUserId: user.id
    })

    return user
  } catch (error) {
    console.error('Comprehensive User Sync Error', {
      clerkUserId,
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    
    return null
  }
}

// Function to delete user from Prisma when deleted in Clerk
async function deleteUserFromPrisma(clerkUserId) {
  console.log(`Attempting to delete user with Clerk ID: ${clerkUserId}`)
  
  try {
    const deletedUser = await prisma.user.delete({
      where: { clerkUserId: clerkUserId }
    })
    
    console.log(`User ${clerkUserId} deleted successfully`, {
      deletedUser
    })
  } catch (error) {
    console.error(`Error deleting user ${clerkUserId}:`, {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    throw error
  }
}

// Ensure the route only accepts POST requests
export const config = {
  api: {
    bodyParser: false
  }
}