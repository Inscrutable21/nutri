// src/components/auth/SignInButton.js
'use client'

import { SignInButton as ClerkSignInButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { User } from 'lucide-react'

export default function SignInButton() {
  const { isSignedIn, user } = useUser()

  if (isSignedIn) {
    return (
      <Link href="/profile" className="flex items-center space-x-2">
        <User className="w-5 h-5" />
        <span className="text-sm">{user.firstName || 'Profile'}</span>
      </Link>
    )
  }

  return (
    <ClerkSignInButton mode="modal">
      <button className="text-sm text-gray-700 hover:text-blue-600 flex items-center space-x-2">
        <User className="w-5 h-5" />
        <span>Sign In</span>
      </button>
    </ClerkSignInButton>
  )
}