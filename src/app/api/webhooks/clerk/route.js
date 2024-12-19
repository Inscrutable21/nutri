// app/api/webhook/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export const runtime = 'edge'

export async function POST(req) {
  console.log('Webhook Received: Starting Processing')

  const headersList = headers()
  const svixId = headersList.get('svix-id')
  const svixTimestamp = headersList.get('svix-timestamp')
  const svixSignature = headersList.get('svix-signature')

  console.log('Svix Headers:', {
    svixId,
    svixTimestamp,
    svixSignature
  })

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing Svix headers')
    return Response.json(
      { error: 'Missing Svix headers' },
      { status: 400 }
    )
  }

  const payload = await req.text()
  console.log('Webhook Payload:', payload)

  let event

  try {
    const wh = new Webhook(process.env.WEBHOOK_SECRET || '')
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature
    })
    console.log('Webhook Verified Successfully')
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return Response.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    )
  }

  const { id: clerkUserId } = event.data
  const eventType = event.type

  if (!eventType || !clerkUserId) {
    return Response.json(
      { error: 'Invalid event data' },
      { status: 400 }
    )
  }

  console.log('Webhook Event Details:', {
    eventType,
    clerkUserId
  })

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated':
        const syncedUser = await syncUserToPrisma(clerkUserId)
        if (!syncedUser) {
          throw new Error('Failed to sync user')
        }
        break
      
      case 'user.deleted':
        await deleteUserFromPrisma(clerkUserId)
        break
      
      default:
        console.log('Unhandled event type:', eventType)
        return Response.json(
          { message: 'Unhandled event type' },
          { status: 200 }
        )
    }

    return Response.json(
      { message: 'Webhook processed successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Webhook processing error:', {
      message: error?.message || 'Unknown error',
      eventType,
      clerkUserId
    })
    
    return Response.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    )
  }
}

async function syncUserToPrisma(clerkUserId) {
  console.log(`Starting sync for user: ${clerkUserId}`)
  
  if (!clerkUserId) {
    throw new Error('No Clerk User ID provided for sync')
  }

  try {
    let clerkUser
    try {
      clerkUser = await clerkClient.users.getUser(clerkUserId)
      console.log('Clerk User Fetched:', {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress
      })
    } catch (clerkFetchError) {
      console.error('Failed to fetch Clerk user', {
        clerkUserId,
        error: clerkFetchError?.message || 'Unknown error'
      })
      throw clerkFetchError
    }

    if (!clerkUser) {
      throw new Error(`No Clerk user found for ID: ${clerkUserId}`)
    }

    const primaryEmailAddress = clerkUser.emailAddresses.find(
      email => email.id === clerkUser.primaryEmailAddressId
    )

    if (!primaryEmailAddress?.emailAddress) {
      throw new Error('User must have a primary email address')
    }

    // Format address if it exists
    const address = clerkUser.primaryAddress ? {
      street: clerkUser.primaryAddress.street1 || null,
      city: clerkUser.primaryAddress.city || null,
      state: clerkUser.primaryAddress.state || null,
      country: clerkUser.primaryAddress.country || null,
      zipCode: clerkUser.primaryAddress.postalCode || null,
      pinCode: null // Not available in Clerk
    } : undefined

    const userData = {
      clerkUserId: clerkUser.id,
      email: primaryEmailAddress.emailAddress,
      firstName: clerkUser.firstName || null,
      lastName: clerkUser.lastName || null,
      profilePicture: clerkUser.imageUrl || null,
      // Only include address if it exists
      ...(address && { address })
    }

    const user = await prisma.user.upsert({
      where: { 
        clerkUserId 
      },
      update: {
        ...userData,
        // Only update non-null values
        firstName: userData.firstName ?? undefined,
        lastName: userData.lastName ?? undefined,
        profilePicture: userData.profilePicture ?? undefined,
        address: address ?? undefined
      },
      create: userData,
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        address: true
      }
    })

    console.log('User Sync Completed Successfully', {
      clerkUserId: user.clerkUserId,
      email: user.email,
      prismaId: user.id
    })

    return user
  } catch (error) {
    console.error('User Sync Error', {
      clerkUserId,
      error: error?.message || 'Unknown error'
    })
    throw error
  }
}

async function deleteUserFromPrisma(clerkUserId) {
  console.log(`Attempting to delete user with Clerk ID: ${clerkUserId}`)
  
  if (!clerkUserId) {
    throw new Error('No Clerk User ID provided for deletion')
  }

  try {
    const deletedUser = await prisma.user.delete({
      where: { clerkUserId }
    })
    
    console.log(`User ${clerkUserId} deleted successfully`, {
      deletedUser
    })
    return deletedUser
  } catch (error) {
    console.error(`Error deleting user ${clerkUserId}:`, {
      error: error?.message || 'Unknown error'
    })
    throw error
  }
}