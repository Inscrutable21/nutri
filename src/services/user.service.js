import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export const userService = {
  async syncClerkUserToDatabase(clerkUserId) {
    // Validate input
    if (!clerkUserId) {
      console.warn('Sync attempted with no Clerk User ID');
      return null;
    }

    try {
      // Fetch user from Clerk with more comprehensive details
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(clerkUserId);
      } catch (clerkFetchError) {
        console.error('Failed to fetch Clerk user', {
          clerkUserId,
          error: clerkFetchError.message
        });
        return null;
      }

      // Validate Clerk user
      if (!clerkUser) {
        console.warn(`No Clerk user found for ID: ${clerkUserId}`);
        return null;
      }

      // Prepare user data with defensive programming
      const userData = {
        clerkUserId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        profilePicture: clerkUser.imageUrl || '',
        
        // Safely extract additional metadata
        metadata: {
          phoneNumbers: clerkUser.phoneNumbers?.map(phone => phone.phoneNumber) || [],
          primaryWeb3Wallet: clerkUser.web3Wallets?.[0]?.web3Wallet || null,
          verifiedExternalAccounts: clerkUser.externalAccounts?.map(account => ({
            provider: account.provider,
            identifier: account.identification?.[0]?.identifier
          })) || []
        },

        // Optional: Safely extract address details
        ...(clerkUser.primaryAddress && {
          address: {
            street: clerkUser.primaryAddress.street || '',
            city: clerkUser.primaryAddress.city || '',
            state: clerkUser.primaryAddress.state || '',
            country: clerkUser.primaryAddress.country || '',
            zipCode: clerkUser.primaryAddress.postalCode || '',
          }
        })
      };

      // Upsert user in the database with comprehensive handling
      const user = await prisma.user.upsert({
        where: { 
          clerkUserId: clerkUserId 
        },
        update: {
          ...userData,
          // Prevent overwriting with empty values
          email: userData.email || undefined,
          firstName: userData.firstName || undefined,
          lastName: userData.lastName || undefined,
          profilePicture: userData.profilePicture || undefined,
        },
        create: userData,
        select: {
          id: true,
          clerkUserId: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true
        }
      });

      console.log('User Sync Completed Successfully', {
        clerkUserId: user.clerkUserId,
        email: user.email
      });

      return user;
    } catch (error) {
      // Comprehensive error logging
      console.error('User Sync Error', {
        clerkUserId,
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Optionally notify error tracking service
      // ErrorTrackingService.capture(error)
      
      return null;
    }
  },

  async getUserByClerkId(clerkUserId) {
    if (!clerkUserId) {
      console.warn('Lookup attempted with no Clerk User ID');
      return null;
    }

    try {
      return await prisma.user.findUnique({
        where: { clerkUserId },
        select: {
          id: true,
          clerkUserId: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true
        }
      });
    } catch (error) {
      console.error('Error fetching user by Clerk ID', {
        clerkUserId,
        message: error.message
      });
      return null;
    }
  }
};