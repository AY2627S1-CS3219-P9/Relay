import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPair, exportPKCS8, jwtVerify, importJWK } from 'jose'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('RS256 access token has required claims and matches published JWKS', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'relay-auth-test-'))
  try {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true })
    const path = join(dir, 'private.pem')
    await writeFile(path, await exportPKCS8(privateKey))
    process.env.JWT_PRIVATE_KEY_FILE = path
    const { issue, jwks, verifyLocal } = await import('../dist/services/token.service.js')
    const user = { sub: 'subject', email: 'user@example.com', emailVerified: true, role: 'admin' }
    const token = await issue(user)
    assert.deepEqual(await verifyLocal(token), user)
    const published = await jwks()
    assert.equal(published.keys.length, 1)
    assert.equal(published.keys[0].alg, 'RS256')
    assert.equal(published.keys[0].d, undefined)
    const key = await importJWK(published.keys[0], 'RS256')
    const { payload } = await jwtVerify(token, key, { issuer: 'relay-user-auth', audience: 'relay-services', algorithms: ['RS256'] })
    assert.equal(payload.sub, user.sub)
    assert.equal(payload.role, user.role)
    assert.ok(payload.exp - payload.iat <= 900)
    await assert.rejects(verifyLocal(token.slice(0, -2) + 'xx'))
  } finally { await rm(dir, { recursive: true, force: true }) }
})
