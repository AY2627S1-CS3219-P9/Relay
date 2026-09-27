import express from 'express'
import supplierRoutes from './routes'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/supplier', supplierRoutes)

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err)
  if (err.message === 'UNAUTHORIZED') {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }
  if (err.message === 'FORBIDDEN') {
    res.status(403).json({ code: 'FORBIDDEN', message: 'Admin access required' })
    return
  }
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Supplier API listening on port ${PORT}`)
})
