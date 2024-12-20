// services/user.service.js
import { Clerk } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma'

// Initialize clerk client with your secret key
const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const userService = {
  async syncClerkUserToDatabase(clerkUserId) {
    if (!clerkUserId) {
      throw new Error('Clerk User ID is required')
    }

    try {
      // Use clerk instead of clerkClient
      const clerkUser = await clerk.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        throw new Error(`No Clerk user found for ID: ${clerkUserId}`)
      }

      // Get primary email with better error handling
      const primaryEmailObj = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      )
      
      
      if (!primaryEmailObj?.emailAddress) {
        throw new Error('User must have a primary email address')
      }

      // Format address as embedded type
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

      // Prepare user data
      const userData = {
        clerkUserId: clerkUser.id,
        email: primaryEmailObj.emailAddress,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        profilePicture: clerkUser.imageUrl || null,
        address: addressData,
        updatedAt: new Date()
      }

      // Upsert user
      const user = await prisma.user.upsert({
        where: { clerkUserId },
        update: userData,
        create: userData
      })

      return user
    } catch (error) {
      console.error('User sync failed:', {
        clerkUserId,
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  },
  
  // Rest of the service methods remain the same
  async deleteUserByClerkId(clerkUserId) {
    if (!clerkUserId) {
      throw new Error('Clerk User ID is required')
    }

    try {
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