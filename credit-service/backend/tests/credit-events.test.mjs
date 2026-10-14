import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { Kafka } from 'kafkajs'
import { prisma } from '../dist/repositories/credit.repository.js'

async function until(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Timed out waiting for a credit event.')
}

test('Kafka events allocate, transfer, release, and delete credit', async () => {
  const topics = {
    userRegistered: process.env.KAFKA_TOPIC_USER_REGISTERED,
    userDeleted: process.env.KAFKA_TOPIC_USER_DELETED,
    errandConfirmed: process.env.KAFKA_TOPIC_ERRAND_CONFIRMED,
    errandCancelled: process.env.KAFKA_TOPIC_ERRAND_CANCELLED,
    errandExpired: process.env.KAFKA_TOPIC_ERRAND_EXPIRED,
  }
  assert.ok(Object.values(topics).every(Boolean))
  const requester = randomUUID()
  const courier = randomUUID()
  const confirmId = randomUUID()
  const cancelId = randomUUID()
  const expireId = randomUUID()
  const ids = [requester, courier]
  const producer = new Kafka({ clientId: 'relay-credit-events-test', brokers: ['kafka:9092'] }).producer()
  const send = (topic, key, value) => producer.send({
    topic, messages: [{ key, value: JSON.stringify(value) }],
  })
  const errand = (id, status, creditAmount) => ({
    errand: {
      id, requesterSub: requester, courierSub: courier, supplierId: null,
      pickupLocation: { lat: 0, lng: 0, buildingName: 'Test', floorNumber: 1 },
      deliveryDetails: { description: 'Test delivery' },
      creditAmount, status,
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })
  try {
    await producer.connect()
    for (const userId of ids) await send(topics.userRegistered, userId, { cognitoSub: userId })
    await until(async () => (await prisma.creditBalance.count({ where: { userId: { in: ids } } })) === 2)
    await prisma.creditBalance.update({
      where: { userId: requester },
      data: { availableCredit: 70, reserveCredit: 30 },
    })
    await send(topics.errandConfirmed, confirmId, errand(confirmId, 'CONFIRMED', 10))
    await until(async () => (await prisma.transactionRecord.findUnique({
      where: { reference: `errand:${confirmId}:CREDIT_TRANSFER` },
    })) !== null)
    await send(topics.errandCancelled, cancelId, errand(cancelId, 'CANCELLED', 5))
    await until(async () => (await prisma.transactionRecord.findUnique({
      where: { reference: `errand:${cancelId}:CREDIT_RELEASE` },
    })) !== null)
    await send(topics.errandExpired, expireId, errand(expireId, 'EXPIRED', 5))
    await until(async () => (await prisma.transactionRecord.findUnique({
      where: { reference: `errand:${expireId}:CREDIT_RELEASE` },
    })) !== null)
    const requesterBalance = await prisma.creditBalance.findUnique({ where: { userId: requester } })
    const courierBalance = await prisma.creditBalance.findUnique({ where: { userId: courier } })
    assert.equal(requesterBalance.availableCredit.toNumber(), 80)
    assert.equal(requesterBalance.reserveCredit.toNumber(), 10)
    assert.equal(courierBalance.availableCredit.toNumber(), 110)
    await send(topics.userDeleted, requester, { cognitoSub: requester })
    await until(async () => (await prisma.transactionRecord.findUnique({
      where: { reference: `user:${requester}:USER_DELETION` },
    })) !== null)
    assert.equal(await prisma.creditBalance.findUnique({ where: { userId: requester } }), null)
  } finally {
    await producer.disconnect()
    await prisma.transactionRecord.deleteMany({
      where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] },
    })
    await prisma.creditBalance.deleteMany({ where: { userId: { in: ids } } })
    await prisma.$disconnect()
  }
})
