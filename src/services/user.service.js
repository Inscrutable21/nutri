import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Add initialization check
const initializeClerkClient = () => {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY is not configured')
  }
}

export const userService = {
  async syncClerkUserToDatabase(clerkUserId) {
    if (!clerkUserId) {
      throw new Error('Clerk User ID is required')
    }

    try {
      // Initialize Clerk client first
      initializeClerkClient()
      
      // Rest of your existing code...
      const clerkUser = await clerkClient.users.getUser(clerkUserId)
      // ...
    } catch (error) {
      console.error('User sync failed:', {
        clerkUserId,
        error: error.message,
        stack: error.stack,
        clerkInitialized: !!process.env.CLERK_SECRET_KEY // Add debug info
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