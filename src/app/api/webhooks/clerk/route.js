// src/app/api/webhooks/clerk/route.js
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'
import '../../../runtime'  // This will use the Node.js runtime


const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

export async function POST(req) {
  const headersList = headers()
  const svix_id = headersList.get('svix-id')
  const svix_timestamp = headersList.get('svix-timestamp')
  const svix_signature = headersList.get('svix-signature')

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, svix-id, svix-timestamp, svix-signature',
    'Content-Type': 'application/json',
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Validate webhook secret
    if (!WEBHOOK_SECRET) {
      console.error('CLERK_WEBHOOK_SECRET is not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Validate headers
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing required Svix headers')
      return new Response(
        JSON.stringify({ error: 'Missing required headers' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Get and parse the webhook body
    const payload = await req.text()
    const body = JSON.parse(payload)

    // Verify webhook signature
    const wh = new Webhook(WEBHOOK_SECRET)
    try {
      wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: eventData, type: eventType } = body
    const userId = eventData?.id

    if (!userId) {
      console.error('No user ID in webhook data')
      return new Response(
        JSON.stringify({ error: 'No user ID provided' }),
        { status: 400, headers: corsHeaders }
      )
    }

    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        try {
          const clerkUser = await clerkClient.users.getUser(userId)
          
          if (!clerkUser) {
            throw new Error(`No Clerk user found for ID: ${userId}`)
          }

          const primaryEmail = clerkUser.emailAddresses.find(
            email => email.id === clerkUser.primaryEmailAddressId
          )

          if (!primaryEmail) {
            throw new Error('User has no primary email address')
          }

          // Extract address from Clerk user data if available
          let addressData = null
          if (clerkUser.primaryAddress) {
            addressData = {
              street: clerkUser.primaryAddress.street1 || null,
              city: clerkUser.primaryAddress.city || null,
              state: clerkUser.primaryAddress.state || null,
              country: clerkUser.primaryAddress.country || null,
              zipCode: clerkUser.primaryAddress.postalCode || null,
              pinCode: null // Since this isn't provided by Clerk
            }
          }

          // Map Clerk user data to your schema
          const userData = {
            clerkUserId: clerkUser.id,
            email: primaryEmail.emailAddress,
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null,
            profilePicture: clerkUser.imageUrl || null,
            // Only include address if we have data
            ...(addressData && { address: addressData }),
            updatedAt: new Date()
          }

          // Upsert user in database
          const user = await prisma.user.upsert({
            where: { clerkUserId: userId },
            update: {
              ...userData,
              // Only update non-null values
              firstName: userData.firstName ?? undefined,
              lastName: userData.lastName ?? undefined,
              profilePicture: userData.profilePicture ?? undefined,
              // Keep existing address if new one isn't provided
              address: addressData ?? undefined
            },
            create: userData
          })

          console.log('User synced successfully:', user.id)

          return new Response(
            JSON.stringify({ success: true, user }),
            { status: 200, headers: corsHeaders }
          )
        } catch (error) {
          console.error('Error syncing user:', error)
          return new Response(
            JSON.stringify({ error: 'User sync failed', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }
      }

      case 'user.deleted': {
        try {
          await prisma.user.delete({
            where: { clerkUserId: userId }
          })

          return new Response(
            JSON.stringify({ success: true, message: 'User deleted successfully' }),
            { status: 200, headers: corsHeaders }
          )
        } catch (error) {
          console.error('Error deleting user:', error)
          return new Response(
            JSON.stringify({ error: 'User deletion failed', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }
      }

      default:
        return new Response(
          JSON.stringify({ message: 'Webhook received' }),
          { status: 200, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
}