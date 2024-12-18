// src/context/ClerkAuthContext.js
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

const ClerkAuthContext = createContext({
  isAuthenticated: false,
  user: null,
  isLoading: true
})

export const ClerkAuthProvider = ({ children }) => {
  const { isSignedIn, user, isLoaded } = useUser()
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    isLoading: true
  })

  useEffect(() => {
    setAuthState({
      isAuthenticated: !!isSignedIn,
      user: user,
      isLoading: !isLoaded
    })
  }, [isSignedIn, user, isLoaded])

  return (
    <ClerkAuthContext.Provider value={authState}>
      {children}
    </ClerkAuthContext.Provider>
  )
}

export const useClerkAuth = () => useContext(ClerkAuthContext)