import * as Amplify from 'aws-amplify'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import { init, loadRemote } from '@module-federation/runtime'
import type { ComponentType } from 'react'
import type { RemoteAppProps, ServiceId } from '@relay/contracts'
import { REMOTE_REGISTRY } from './RemoteRegistry'

type RemoteModule = { default: ComponentType<RemoteAppProps> }

// configure Module Federation to find components in the registry
init({
  name: 'relayHost',
  remotes: Object.values(REMOTE_REGISTRY).map(({ name, entry }) => ({
    name,
    type: 'module' as const,
    entry,
  })),
  shared: {
    'aws-amplify': {
      version: '6.22.0',
      lib: () => Amplify,
      shareConfig: { singleton: true, requiredVersion: '^6.22.0' },
    },
    'aws-amplify/auth': {
      version: '6.22.0',
      lib: () => import('aws-amplify/auth'),
      shareConfig: { singleton: true, requiredVersion: '^6.22.0' },
    },
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
  const { name, exposedModule } = REMOTE_REGISTRY[service]
  const remote = await loadRemote<RemoteModule>(`${name}/${exposedModule.replace('./', '')}`)
  if (!remote) throw new Error(`${service} frontend returned no application.`)
  return remote
}
