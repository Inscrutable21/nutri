import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  // Verify the webhook is coming from Clerk
  const headerPayload = headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  // If headers are missing, return an error
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing Svix headers', {
      svixId: !!svixId,
      svixTimestamp: !!svixTimestamp,
      svixSignature: !!svixSignature
    })
    return new NextResponse('Error: Missing Svix headers', { status: 400 })
  }

  // Validate webhook secret is set
  const webhookSecret = process.env.WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('WEBHOOK_SECRET is not set in environment variables')
    return new NextResponse('Error: Webhook secret not configured', { status: 500 })
  }

  // Get the raw body
  const payload = await req.text()

  // Create a new Svix Webhook instance with your webhook secret
  let webhook
  try {
    webhook = new Webhook(webhookSecret)
  } catch (err) {
    console.error('Failed to initialize Svix Webhook', err)
    return new NextResponse('Error: Failed to initialize webhook', { status: 500 })
  }

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
    return new NextResponse('Error: Webhook verification failed', { status: 400 })
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
        return new NextResponse(`Unhandled event type: ${eventType}`, { status: 200 })
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new NextResponse('Error processing webhook', { status: 500 })
  }
}

// Function to sync Clerk user to Prisma with comprehensive error handling
async function syncUserToPrisma(clerkUserId) {
  if (!clerkUserId) {
    console.warn('Attempted to sync user with no Clerk User ID')
    return
  }

  try {
    // Fetch user from Clerk with comprehensive error handling
    let clerkUser
    try {
      clerkUser = await clerkClient.users.getUser(clerkUserId)
    } catch (clerkFetchError) {
      console.error('Failed to fetch Clerk user details', {
        clerkUserId,
        error: clerkFetchError.message || 'Unknown error'
      })
      return
    }

    // Validate Clerk user
    if (!clerkUser) {
      console.warn(`No Clerk user found for ID: ${clerkUserId}`)
      return
    }

    // Prepare user data with defensive programming
    const userData = {
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      profilePicture: clerkUser.imageUrl || '',
      
      // Safely extract additional metadata
      metadata: {
        phoneNumbers: clerkUser.phoneNumbers?.map(phone => phone.phoneNumber) || [],
        primaryWeb3Wallet: clerkUser.web3Wallets?.[0]?.web3Wallet || null,
        verifiedExternalAccounts: clerkUser.externalAccounts?.map(account => ({
          provider: account.provider,
          identifier: account.identification?.[0]?.identifier
        })) || []
      },

      // Optional: Safely extract address details
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

    // Comprehensive upsert with detailed logging
    const upsertResult = await prisma.user.upsert({
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
        email: true
      }
    })

    console.log('User Sync Completed Successfully', {
      clerkUserId: upsertResult.clerkUserId,
      email: upsertResult.email,
      internalId: upsertResult.id
    })

    return upsertResult
  } catch (error) {
    console.error('Comprehensive User Sync Error', {
      clerkUserId,
      message: error.message || 'Unknown error',
      stack: error.stack || 'No stack trace'
    })
    
    return null
  }
}

// Function to delete user from Prisma when deleted in Clerk
async function deleteUserFromPrisma(clerkUserId) {
  if (!clerkUserId) {
    console.warn('Attempted to delete user with no Clerk User ID')
    return
  }

  try {
    const deletedUser = await prisma.user.delete({
      where: { clerkUserId: clerkUserId }
    })

    console.log(`User ${clerkUserId} deleted successfully`, {
      deletedUserId: deletedUser.id
    })
  } catch (error) {
    console.error(`Error deleting user ${clerkUserId}:`, error)
    
    // If user not found, it might have been already deleted
    if (error.code === 'P2025') {
      console.warn(`User ${clerkUserId} not found in database, likely already deleted`)
    } else {
      throw error
    }
  }
}

// Ensure the route only accepts POST requests
export const config = {
  api: {
    bodyParser: false
  }
}