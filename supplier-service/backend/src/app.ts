import express from 'express'
import { SupplierController } from './controllers/supplier.controller'
import { SupplierService } from './services/supplier.service'
import { SupplierRepository } from './repositories/supplier.repository'
import { createSupplierRouter } from './routes/supplier.routes'

const repository = new SupplierRepository()
const service = new SupplierService(repository)
const controller = new SupplierController(service)
const supplierRouter = createSupplierRouter(controller)

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/supplier', supplierRouter)

app.listen(PORT, () => {
  console.log(`Supplier API listening on port ${PORT}`)
})
