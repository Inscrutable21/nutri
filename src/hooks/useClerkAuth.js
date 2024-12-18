// src/hooks/useClerkAuth.js
import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { userService } from '@/services/user.service'

export const useClerkAuth = () => {
  const { isSignedIn, user } = useUser()
  const [databaseUser, setDatabaseUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const syncUserToDB = async () => {
      if (isSignedIn && user) {
        try {
          const syncedUser = await userService.syncClerkUserToDatabase(user.id)
          setDatabaseUser(syncedUser)
        } catch (error) {
          console.error('Failed to sync user:', error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    syncUserToDB()
  }, [isSignedIn, user])

  return { 
    isSignedIn, 
    clerkUser: user, 
    databaseUser, 
    isLoading 
  }
}