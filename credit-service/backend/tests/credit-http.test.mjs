import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createApp, closeAppResources } from '../dist/app.js'
import { prisma } from '../dist/repositories/credit.repository.js'

test('credit HTTP reads authenticate through User Service and isolate user data', async (t) => {
  const owner = randomUUID()
  const other = randomUUID()
  const empty = randomUUID()
  const ids = [owner, other, empty]
  const prefix = randomUUID()
  const token = randomUUID()
  const authRequests = []
  const userService = createServer((req, res) => {
    authRequests.push({
      path: req.url,
      method: req.method,
      cookie: req.headers.cookie,
      token: req.headers['x-user-service-token'],
    })
    if (req.headers.cookie === 'relay_session=unavailable') {
      res.writeHead(500).end()
      return
    }
    if (req.headers.cookie === 'relay_session=timeout') return
    const subject =
      req.headers.cookie === 'relay_session=owner'
        ? owner
        : req.headers.cookie === 'relay_session=empty'
          ? empty
          : undefined
    if (!subject) {
      res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        ok: true,
        data: {
          user: {
            subject,
            role: 'user',
            email: 'test@example.com',
            emailVerified: true,
            profileCreated: true,
          },
        },
      }),
    )
  })
  await new Promise((resolve) => userService.listen(0, '127.0.0.1', resolve))
  process.env.USER_API_URL = `http://127.0.0.1:${userService.address().port}`
  process.env.USER_API_TIMEOUT = '100'
  process.env.USER_SERVICE_INTERNAL_TOKEN = token
  const api = createApp().listen(0, '127.0.0.1')
  await new Promise((resolve) => api.once('listening', resolve))
  const url = `http://127.0.0.1:${api.address().port}`
  async function request(path, cookie, method = 'GET') {
    const response = await fetch(url + path, { method, headers: cookie ? { Cookie: cookie } : {} })
    const text = await response.text()
    return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text }
  }
  try {
    await prisma.creditBalance.create({
      data: { userId: owner, availableCredit: '75.25', reserveCredit: '12.5' },
    })
    await prisma.transactionRecord.createMany({
      data: [
        {
          reference: `errand:${prefix}-out:CREDIT_TRANSFER`,
          senderId: owner,
          receiverId: other,
          type: 'CREDIT_TRANSFER',
          amount: '12.5',
          time: new Date('2026-01-01'),
        },
        {
          reference: `errand:${prefix}-in:CREDIT_TRANSFER`,
          senderId: other,
          receiverId: owner,
          type: 'CREDIT_TRANSFER',
          amount: '3.25',
          time: new Date('2026-01-02'),
        },
        {
          reference: `errand:${prefix}-self:CREDIT_RESERVE`,
          senderId: owner,
          receiverId: owner,
          type: 'CREDIT_RESERVE',
          amount: '2.1',
          time: new Date('2026-01-03'),
        },
        {
          reference: `user:${prefix}-private:INITIAL_ALLOCATION`,
          senderId: other,
          receiverId: other,
          type: 'INITIAL_ALLOCATION',
          amount: 100,
          time: new Date('2026-01-04'),
        },
      ],
    })
    await t.test('missing cookie is rejected without contacting User Service', async () => {
      const count = authRequests.length
      for (const path of ['/api/credit', '/api/credit/history']) {
        const response = await request(path)
        assert.equal(response.status, 401)
        assert.equal(response.body.code, 'UNAUTHENTICATED')
      }
      assert.equal(authRequests.length, count)
    })
    await t.test('expired sessions and User Service failures fail closed', async () => {
      for (const path of ['/api/credit', '/api/credit/history']) {
        assert.equal((await request(path, 'relay_session=expired')).status, 401)
        assert.equal((await request(path, 'relay_session=unavailable')).status, 503)
        assert.equal((await request(path, 'relay_session=timeout')).status, 503)
      }
    })
    await t.test('balance matches the contract and forwards service authentication', async () => {
      const response = await request('/api/credit', 'relay_session=owner')
      assert.equal(response.status, 200)
      assert.deepEqual(Object.keys(response.body).sort(), [
        'availableCredit',
        'lastUpdated',
        'reserveCredit',
        'userId',
      ])
      assert.equal(response.body.userId, owner)
      assert.equal(response.body.availableCredit, 75.25)
      assert.equal(response.body.reserveCredit, 12.5)
      assert.ok(Number.isFinite(Date.parse(response.body.lastUpdated)))
      assert.deepEqual(authRequests.at(-1), {
        path: '/internal/user/session/validate',
        method: 'POST',
        cookie: 'relay_session=owner',
        token,
      })
    })
    await t.test(
      'history includes incoming/outgoing records once, newest first, and excludes other users',
      async () => {
        const response = await request('/api/credit/history', 'relay_session=owner')
        assert.equal(response.status, 200)
        assert.deepEqual(
          response.body.records.map((record) => record.reference.id),
          [`${prefix}-self`, `${prefix}-in`, `${prefix}-out`],
        )
        assert.equal(response.body.records[1].amount, 3.25)
        assert.deepEqual(response.body.records[1].reference, {
          service: 'errand',
          id: `${prefix}-in`,
          type: 'CREDIT_TRANSFER',
        })
        assert.ok(response.body.records.every((record) => typeof record.amount === 'number'))
      },
    )
    await t.test('caller cannot select another user and malformed userId is rejected', async () => {
      for (const path of ['/api/credit', '/api/credit/history']) {
        const forbidden = await request(`${path}?userId=${other}`, 'relay_session=owner')
        assert.equal(forbidden.status, 403)
        assert.equal(forbidden.body.code, 'FORBIDDEN')
        assert.equal((await request(`${path}?userId=`, 'relay_session=owner')).status, 400)
        assert.equal(
          (await request(`${path}?userId=a&userId=b`, 'relay_session=owner')).status,
          400,
        )
        assert.equal((await request(`${path}?userId=${owner}`, 'relay_session=owner')).status, 200)
      }
    })
    await t.test(
      'missing balance returns 404 and missing history returns an empty list',
      async () => {
        const balance = await request('/api/credit', 'relay_session=empty')
        assert.equal(balance.status, 404)
        assert.equal(balance.body.code, 'USER_NOT_FOUND')
        assert.deepEqual(await request('/api/credit/history', 'relay_session=empty'), {
          status: 200,
          body: { records: [] },
        })
      },
    )
    await t.test('no reserve or transaction mutation endpoint is exposed', async () => {
      assert.equal((await request('/api/credit', 'relay_session=owner', 'POST')).status, 404)
      assert.equal(
        (await request('/api/credit/reserve', 'relay_session=owner', 'POST')).status,
        404,
      )
    })
  } finally {
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
