import { app } from './app.js'
import { getEnv } from './config/env.js'
const { port } = getEnv()
const server = app.listen(port, () => console.log(`User Auth Service listening on port ${port}`))
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close(() => process.exit(0)))
}
