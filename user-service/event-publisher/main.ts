import { UserEventPublisher } from './user-event-publisher.js'
const publisher = new UserEventPublisher()
publisher.start()
async function stop() { await publisher.stop(); process.exit(0) }
process.once('SIGTERM', () => void stop())
process.once('SIGINT', () => void stop())
