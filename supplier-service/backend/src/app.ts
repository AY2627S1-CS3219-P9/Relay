import express from 'express'
import { SupplierController } from './controllers/supplier.controller'
import { SupplierService } from './services/supplier.service'
import { SupplierRepository } from './repositories/supplier.repository'
import { createSupplierRouter } from './routes/supplier.routes'
import { createInternalSupplierRouter } from './routes/internal-supplier.routes'
import { internalServiceAuth } from './middleware/internal-auth.middleware'
import { getEnv } from './config/env'
import { SupplierErrors } from '@relay/contracts/supplier'
import { SupplierServiceError } from './types/supplier.types'

const repository = new SupplierRepository()
const service = new SupplierService(repository)
const controller = new SupplierController(service)
const supplierRouter = createSupplierRouter(controller)
const internalSupplierRouter = createInternalSupplierRouter(controller)

const app = express()
const env = getEnv()

app.use(express.json())

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/supplier', supplierRouter)
app.use('/internal/suppliers', internalServiceAuth, internalSupplierRouter)

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SupplierServiceError) {
    res.status(error.statusCode).json({ code: error.code, message: error.message })
    return
  }

  console.error(error)
  res.status(500).json({ code: SupplierErrors.INTERNAL_ERROR, message: 'Internal server error' })
})

app.listen(env.port, () => {
  console.log(`Supplier API listening on port ${env.port}`)
})
