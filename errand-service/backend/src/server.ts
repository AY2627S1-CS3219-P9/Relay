import { createApp } from './app.js'
import { getEnv } from './config/env.js'

const env = getEnv()
const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`Errand Service listening on port ${env.port}`)
})

function shutdown(signal: string) {
  console.log(`${signal} received; shutting down Errand Service`)
  server.close(() => process.exit(0))
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
