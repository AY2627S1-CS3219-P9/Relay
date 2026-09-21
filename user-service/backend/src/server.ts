import type { Server } from 'node:http'
import { app, closeAppResources } from './app.js'
import { getEnv } from './config/env.js'

const env = getEnv()
let server: Server | undefined

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received; shutting down User Service.`)

  await new Promise<void>((resolve) => {
    if (!server) {
      resolve()
      return
    }
    server.close(() => resolve())
  })

  await closeAppResources()
  process.exit(0)
}

server = app.listen(env.port, () => {
  console.log(`User Service listening on port ${env.port}`)
})

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
