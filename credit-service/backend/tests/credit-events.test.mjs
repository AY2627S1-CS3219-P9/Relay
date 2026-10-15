import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { Kafka } from 'kafkajs'
import { createApp, closeAppResources } from '../dist/app.js'
import { prisma } from '../dist/repositories/credit.repository.js'

async function until(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Timed out waiting for a credit event.')
}

test('new users view, reserve, and transfer credit through HTTP and Kafka', async () => {
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
  const userService = createServer((req, res) => {
    const subject =
      req.headers.cookie === 'relay_session=requester'
        ? requester
        : req.headers.cookie === 'relay_session=courier'
          ? courier
          : undefined
    if (!subject || req.url !== '/internal/user/session/validate') {
      res.writeHead(401).end()
      return
    }
    res
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ ok: true, data: { user: { subject } } }))
  })
  await new Promise((resolve) => userService.listen(0, '127.0.0.1', resolve))
  process.env.USER_API_URL = `http://127.0.0.1:${userService.address().port}`
  const api = createApp().listen(0, '127.0.0.1')
  await new Promise((resolve) => api.once('listening', resolve))
  const url = `http://127.0.0.1:${api.address().port}`
  const request = async (cookie, path = '/api/credit', body) => {
    const response = await fetch(url + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Cookie: `relay_session=${cookie}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: await response.json() }
  }
  const producer = new Kafka({
    clientId: 'relay-credit-workflow-test',
    brokers: ['kafka:9092'],
  }).producer()
  const send = (topic, key, value) =>
    producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    })
  const errand = (id, status, creditAmount) => ({
    errand: {
      id,
      requesterSub: requester,
      courierSub: courier,
      supplierId: null,
      pickupLocation: { lat: 0, lng: 0, buildingName: 'Test', floorNumber: 1 },
      deliveryDetails: { description: 'Test delivery' },
      creditAmount,
      status,
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })
  const reserve = (id, amount) =>
    request('requester', '/api/credit/reserve', {
      transactionReference: { service: 'errand', id, type: 'CREDIT_RESERVE' },
      userId: requester,
      amount,
    })
  try {
    await producer.connect()
    for (const userId of ids) await send(topics.userRegistered, userId, { cognitoSub: userId })
    await until(async () => (await request('requester')).status === 200)
    await until(async () => (await request('courier')).status === 200)
    assert.equal((await request('requester')).body.availableCredit, 100)
    assert.equal((await request('courier')).body.availableCredit, 100)

    for (const [id, amount] of [
      [confirmId, 10],
      [cancelId, 5],
      [expireId, 5],
    ]) {
      const response = await reserve(id, amount)
      assert.equal(response.status, 200)
      assert.equal(response.body.status, 'RESERVE_SUCCESS')
    }
    const reserved = await request('requester')
    assert.equal(reserved.body.availableCredit, 80)
    assert.equal(reserved.body.reserveCredit, 20)

    await send(topics.errandConfirmed, confirmId, errand(confirmId, 'CONFIRMED', 10))
    await send(topics.errandCancelled, cancelId, errand(cancelId, 'CANCELLED', 5))
    await send(topics.errandExpired, expireId, errand(expireId, 'EXPIRED', 5))
    await until(async () => {
      const requesterCredit = await request('requester')
      const courierCredit = await request('courier')
      return (
        requesterCredit.body.availableCredit === 90 &&
        requesterCredit.body.reserveCredit === 0 &&
        courierCredit.body.availableCredit === 110
      )
    })
    const finalRequester = await request('requester')
    assert.equal(finalRequester.body.availableCredit, 90)
    assert.equal(finalRequester.body.reserveCredit, 0)

    await send(topics.userDeleted, requester, { cognitoSub: requester })
    await until(async () => (await request('requester')).status === 404)
  } finally {
    await producer.disconnect()
    await prisma.transactionRecord.deleteMany({
      where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] },
    })
    await prisma.creditBalance.deleteMany({ where: { userId: { in: ids } } })
    api.closeAllConnections()
    userService.closeAllConnections()
    await Promise.all([
      new Promise((resolve) => api.close(resolve)),
      new Promise((resolve) => userService.close(resolve)),
    ])
    await closeAppResources()
  }
})
