import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import { init, loadRemote } from '@module-federation/runtime'
import type { ComponentType } from 'react'
import type { RemoteAppProps, ServiceId } from '@relay/contracts'

type RemoteModule = { default: ComponentType<RemoteAppProps> }

const remoteIds: Record<ServiceId, string> = {
  supplier: 'supplierFrontend/App',
  user: 'userFrontend/App',
  order: 'orderFrontend/App',
  credit: 'creditFrontend/App',
}

// Runtime registration never fetches a remote during host startup.
init({
  name: 'relayHost',
  remotes: [
    { name: 'supplierFrontend', type: 'module', entry: '/remotes/supplier/remoteEntry.js' },
    { name: 'userFrontend', type: 'module', entry: '/remotes/user/remoteEntry.js' },
    { name: 'orderFrontend', type: 'module', entry: '/remotes/order/remoteEntry.js' },
    { name: 'creditFrontend', type: 'module', entry: '/remotes/credit/remoteEntry.js' },
  ],
  shared: {
    react: {
      version: '19.2.8',
      lib: () => React,
      shareConfig: { singleton: true, requiredVersion: '^19.2.8' },
    },
    'react-dom': {
      version: '19.2.8',
      lib: () => ReactDOM,
      shareConfig: { singleton: true, requiredVersion: '^19.2.8' },
    },
    'react-dom/client': {
      version: '19.2.8',
      lib: () => ReactDOMClient,
      shareConfig: { singleton: true, requiredVersion: '^19.2.8' },
    },
  },
})

export async function loadServiceRemote(service: ServiceId): Promise<RemoteModule> {
  const remote = await loadRemote<RemoteModule>(remoteIds[service])
  if (!remote) throw new Error(`${service} frontend returned no application.`)
  return remote
}
