// src/components/auth/UserProfile.js
'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import Image from 'next/image'

export default function UserProfile() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex items-center space-x-4">
      <UserButton 
        afterSignOutUrl="/"
        appearance={{
          elements: {
            userButtonAvatarBox: 'w-10 h-10'
          }
        }}
      />
      {user && (
        <div>
          <h2 className="text-lg font-semibold">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-sm text-gray-500">{user.emailAddresses[0]?.emailAddress}</p>
        </div>
      )}
    </div>
  )
}