// src/services/clerk.service.js
import { clerkClient } from '@clerk/nextjs/server'

export const clerkService = {
  async getUserById(userId) {
    try {
      return await clerkClient.users.getUser(userId)
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  },

  async updateUserMetadata(userId, metadata) {
    try {
      return await clerkClient.users.updateUserMetadata(userId, metadata)
    } catch (error) {
      console.error('Error updating user metadata:', error)
      return null
    }
  }
}