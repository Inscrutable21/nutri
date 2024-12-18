// src/lib/clerk.js
import { clerkClient } from '@clerk/nextjs/server'

export const getClerkUser = async (userId) => {
  try {
    return await clerkClient.users.getUser(userId)
  } catch (error) {
    console.error('Error fetching Clerk user:', error)
    return null
  }
}

export const mapClerkUserToPrisma = (clerkUser) => {
  if (!clerkUser) return null

  return {
    clerkUserId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    firstName: clerkUser.firstName || '',
    lastName: clerkUser.lastName || '',
    profilePicture: clerkUser.imageUrl || '',
  }
}