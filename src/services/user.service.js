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

      // 2. Get primary email with better error handling
      const primaryEmailObj = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      )
      
      if (!primaryEmailObj?.emailAddress) {
        throw new Error('User must have a primary email address')
      }

      // 3. Format address as embedded type
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

      // 4. Prepare user data with embedded address
      const userData = {
        clerkUserId: clerkUser.id,
        email: primaryEmailObj.emailAddress,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        profilePicture: clerkUser.imageUrl || null,
        address: addressData,
        updatedAt: new Date()
      }

      // 5. Upsert user with embedded address
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
          address: addressData ?? undefined
        },
        create: userData
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
      // Delete the user (address will be automatically deleted as it's embedded)
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
        where: { clerkUserId }
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