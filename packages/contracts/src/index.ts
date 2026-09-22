export type ServiceId = 'supplier' | 'user' | 'order' | 'credit'

export type ServiceMetadata = {
  id: ServiceId
  label: string
  description: string
  path: string
}

export type RemoteAppProps = {
  onNavigateHome?: () => void
  onNavigate?: (service: ServiceId) => void
  onOpenProfile?: (anchor: ProfileAnchor) => void
  onCloseProfile?: () => void
  presentation?: 'full' | 'card'
}

export type ProfileAnchor = {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export const SERVICE_METADATA: Record<ServiceId, ServiceMetadata> = {
  supplier: {
    id: 'supplier',
    label: 'Supplier service',
    description: 'Find campus shops, facilities, and collection points.',
    path: '/suppliers',
  },
  user: {
    id: 'user',
    label: 'User service',
    description: 'Manage your Relay profile and student identity.',
    path: '/users',
  },
  order: {
    id: 'order',
    label: 'Order service',
    description: 'Create, accept, and track campus errand requests.',
    path: '/orders',
  },
  credit: {
    id: 'credit',
    label: 'Credit service',
    description: 'View your balance and closed-economy transactions.',
    path: '/credits',
  },
}

export * from './user'
export * from './supplier'
