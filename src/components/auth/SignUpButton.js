// src/components/auth/SignUpButton.js
'use client'

import { SignUpButton as ClerkSignUpButton } from '@clerk/nextjs'
import { UserPlus } from 'lucide-react'

export default function SignUpButton() {
  return (
    <ClerkSignUpButton mode="modal">
      <button className="text-sm text-gray-700 hover:text-blue-600 flex items-center space-x-2">
        <UserPlus className="w-5 h-5" />
        <span>Sign Up</span>
      </button>
    </ClerkSignUpButton>
  )
}