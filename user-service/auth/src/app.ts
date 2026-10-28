import express, { type ErrorRequestHandler } from 'express'
export const app = express()
app.use(express.json({ limit: '1mb' }))
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }))
// JWT issuing routes will be mounted under /api/auth in the implementation phase.
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError) {
    res.status(400).json({ ok: false, error: { code: 'VALIDATION_FAILED', message: 'The request body contains invalid JSON.' } })
    return
  }
  console.error(error)
  res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } })
}
app.use(errorHandler)
