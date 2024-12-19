// services/user.service.js
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export const userService = {
  async syncClerkUserToDatabase(clerkUserId) {
    if (!clerkUserId) {
      throw new Error('Clerk User ID is required')
    }

    try {
      // 1. Fetch user data from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId)
      if (!clerkUser) {
        throw new Error(`No Clerk user found for ID: ${clerkUserId}`)
      }

      // 2. Get primary email
      const primaryEmail = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      )?.emailAddress

      if (!primaryEmail) {
        throw new Error('User must have a primary email address')
      }

      // 3. Format address if available
      const address = clerkUser.primaryAddress ? {
        street: clerkUser.primaryAddress.street1 || null,
        city: clerkUser.primaryAddress.city || null,
        state: clerkUser.primaryAddress.state || null,
        country: clerkUser.primaryAddress.country || null,
        zipCode: clerkUser.primaryAddress.postalCode || null,
        pinCode: null // Not provided by Clerk
      } : null

      // 4. Prepare user data
      const userData = {
        clerkUserId: clerkUser.id,
        email: primaryEmail,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        profilePicture: clerkUser.imageUrl || null,
        address: address || undefined,
        updatedAt: new Date()
      }

      // 5. Upsert user in database
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
        include: {
          address: true
        }
      })

      return user
    } catch (error) {
      console.error('User sync failed:', {
        clerkUserId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  },

  async deleteUserByClerkId(clerkUserId) {
    if (!clerkUserId) {
      throw new Error('Clerk User ID is required')
    }

    try {
      // Delete the user and all related data
      await prisma.user.delete({
        where: { clerkUserId }
      })
      
      return true
    } catch (error) {
      console.error('User deletion failed:', {
        clerkUserId,
        error: error.message
      })
      throw error
    }
  },

  async getUserByClerkId(clerkUserId) {
    if (!clerkUserId) {
      throw new Error('Clerk User ID is required')
    }

    try {
      return await prisma.user.findUnique({
        where: { clerkUserId },
        include: {
          address: true
        }
      })
    } catch (error) {
      console.error('User fetch failed:', {
        clerkUserId,
        error: error.message
      })
      throw error
    }
  }
}