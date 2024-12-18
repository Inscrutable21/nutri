'use client';

import { useUser, SignOutButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirect('/sign-in');
    }
  }, [isLoaded, isSignedIn]);

  // Handle loading state
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Additional safety check
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Image
            src={user.profileImageUrl || '/default-avatar.png'}
            alt="Profile"
            className="w-20 h-20 rounded-full mr-4"
            width={80} // Set image width
            height={80} // Set image height
            unoptimized={user.profileImageUrl ? false : true} // Avoid optimization for default avatars
          />
          <div>
            <h2 className="text-xl font-semibold">
              {user.fullName || 'User'}
            </h2>
            <p className="text-gray-600">
              {user.primaryEmailAddress?.emailAddress || 'No email'}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="mt-6">
          <SignOutButton redirectUrl="/sign-in">
            <button className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
