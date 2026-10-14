import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { UserRepository, prisma } from '../dist/repositories/user.repository.js'

test('profile registration and deletion write user events to the outbox', async () => {
  assert.ok(process.env.KAFKA_TOPIC_USER_REGISTERED)
  assert.ok(process.env.KAFKA_TOPIC_USER_DELETED)
  const repository = new UserRepository()
  const cognitoSub = randomUUID()
  const username = `outbox-${cognitoSub.slice(0, 12)}`
  try {
    await repository.createProfile(cognitoSub, { username })
    const registration = await prisma.userOutboxEvent.findFirst({
      where: { key: cognitoSub, topic: process.env.KAFKA_TOPIC_USER_REGISTERED },
    })
    assert.deepEqual(registration.payload, { cognitoSub })
    await repository.deleteProfile(cognitoSub)
    assert.equal(await repository.findByCognitoSub(cognitoSub), null)
    const deletion = await prisma.userOutboxEvent.findFirst({
      where: { key: cognitoSub, topic: process.env.KAFKA_TOPIC_USER_DELETED },
    })
    assert.deepEqual(deletion.payload, { cognitoSub })
  } finally {
    await prisma.userProfile.deleteMany({ where: { cognitoSub } })
    await prisma.userOutboxEvent.deleteMany({ where: { key: cognitoSub } })
    await prisma.$disconnect()
  }
})
