// src/app/api/webhooks/clerk/route.js
export const runtime = 'nodejs'

import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

export async function POST(req) {
  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET environment variable')
    return Response.json(
      { error: 'Missing webhook secret' },
      { status: 500 }
    )
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return Response.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    )
  }

  try {
    const payload = await req.text()
    const body = JSON.parse(payload)

    // Verify webhook signature
    const wh = new Webhook(WEBHOOK_SECRET)
    try {
      wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      })
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return Response.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const { data: eventData, type: eventType } = body
    const userId = eventData?.id

    if (!userId) {
      return Response.json(
        { error: 'Missing user ID in webhook data' },
        { status: 400 }
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

          // Get primary email
          const primaryEmail = clerkUser.emailAddresses.find(
            email => email.id === clerkUser.primaryEmailAddressId
          )?.emailAddress

          if (!primaryEmail) {
            throw new Error('User has no primary email address')
          }

          // Extract username from email if needed
          const username = primaryEmail.split('@')[0]

          // Prepare minimal user data
          const userData = {
            clerkUserId: clerkUser.id,
            email: primaryEmail,
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null,
            updatedAt: new Date()
          }

          // Upsert user with only required fields
          const user = await prisma.user.upsert({
            where: { clerkUserId: userId },
            update: userData,
            create: userData,
            // Select only specific fields
            select: {
              email: true,
              firstName: true,
              lastName: true,
              clerkUserId: true
            }
          })

          return Response.json({ 
            success: true, 
            user: {
              ...user,
              username // Add derived username if needed
            }
          })
        } catch (error) {
          console.error('Error processing user webhook:', error)
          return Response.json(
            { error: error.message },
            { status: 500 }
          )
        }
      }

      case 'user.deleted': {
        try {
          await prisma.user.delete({
            where: { clerkUserId: userId }
          })
          return Response.json({ 
            success: true,
            message: 'User deleted successfully'
          })
        } catch (error) {
          console.error('Error deleting user:', error)
          return Response.json(
            { error: error.message },
            { status: 500 }
          )
        }
      }

      default:
        return Response.json({ success: true })
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}