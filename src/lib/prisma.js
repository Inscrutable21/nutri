import { PrismaClient } from '@prisma/client'

let prisma

try {
  prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  })
} catch (error) {
  console.error('Prisma Client Initialization Error:', error)
  throw error
}

export { prisma }