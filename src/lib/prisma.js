// lib/prisma.js
import { PrismaClient } from '@prisma/client'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global

export const prisma = 
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma