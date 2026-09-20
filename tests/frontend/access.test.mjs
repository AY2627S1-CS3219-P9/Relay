import assert from 'node:assert/strict'
import { test } from 'node:test'

const shellUrl = (process.env.RELAY_SHELL_URL ?? 'http://localhost:8080').replace(/\/$/, '')

const frontendServices = [
  { id: 'supplier', federationName: 'supplierFrontend' },
  { id: 'user', federationName: 'userFrontend' },
  { id: 'order', federationName: 'orderFrontend' },
  { id: 'credit', federationName: 'creditFrontend' },
]

async function fetchText(url) {
  let response

  try {
    response = await fetch(url)
  } catch (error) {
    throw new Error(`Could not connect to ${url}. Is the Relay environment running?`, {
      cause: error,
    })
  }

  const body = await response.text()
  assert.equal(response.ok, true, `${url} returned HTTP ${response.status}`)
  return body
}

test('the Relay shell is reachable', async () => {
  const body = await fetchText(`${shellUrl}/`)
  assert.match(body, /Relay host application|id=["']root["']/)
})

for (const { id, federationName } of frontendServices) {
  test(`${id} frontend is accessible through the shell`, async () => {
    const url = `${shellUrl}/remotes/${id}/remoteEntry.js`
    const body = await fetchText(url)

    assert.match(body, new RegExp(federationName))
    assert.match(body, /App/)
  })
}
