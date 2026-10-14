import express from 'express'
import { CreditRepository, prisma } from './repositories/credit.repository.js'
export const app = express()
const repository = new CreditRepository()
app.use(express.json())
app.get(['/health', '/healthz'], async (_req, res) => {
  try {
    await repository.checkTables()
    res.status(200).json({ status: 'ok', database: 'ok' })
  } catch (error) {
    console.error('Credit database readiness check failed:', error)
    res.status(503).json({ status: 'unavailable', database: 'unavailable' })
  }
})
export async function closeAppResources(): Promise<void> {
  await prisma.$disconnect()
}
