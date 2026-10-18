export type ServiceId = 'supplier' | 'user' | 'errand' | 'credit'

export type ServiceMetadata = {
  id: ServiceId
  label: string
  description: string
  path: string
}

export type Session = {
  token: string // raw JWT string to pass to backend
  userData: {
    id: string
    email: string
    emailVerified: boolean
    profileCreated: boolean
    isAdmin: boolean
  }
}

export type SessionError = {
  code: 'SESSION INVALIDATED'
  message: string
}

type FetchSessionOptions = { forceRefresh?: boolean }

export type FetchSessionHandler = (options?: FetchSessionOptions) => Promise<Session>

export type ErrandViewContext =
  | {
      view: 'create'
      supplierId?: string
      anchor?: {
        top: number
        left: number
        right: number
        bottom: number
      }
    }
  | {
      view: 'requests'
    }
  | {
      view: 'my-errands'
    }
  | {
      view: 'explore'
    }
  | {
      view: 'supplier'
      supplierId: string
      scope: 'explore' | 'mine'
      supplier?: import('./supplier/models').Supplier
    }

export type UserLocation = {
  lat: number
  lng: number
}

export type MapViewport = {
  center: UserLocation
  zoom: number
}

export type RemoteAppProps = {
  fetchSession?: FetchSessionHandler
  authVersion?: number
  /** Cognito subject from the authenticated session, distinct from the profile database id. */
  authenticatedSubject?: string
  userProfile?: import('./user/models').User | null
  creditBalance?: import('./credit/models').CreditBalance | null
  invalidateCreditBalance?: () => void
  refreshUserProfile?: () => Promise<void>
  navigateHome?: () => void
  navigateTo?: (service: ServiceId) => void
  openProfile?: (anchor: ProfileAnchor) => void
  openCredit?: (anchor: ProfileAnchor) => void
  closeCredit?: () => void
  creditHistoryOpen?: boolean
  showCreditHistory?: () => void
  showCreditBalance?: () => void
  closeProfile?: () => void
  openErrandView?: (context: ErrandViewContext) => void
  errandViewContext?: ErrandViewContext
  userLocation?: UserLocation
  requestUserLocation?: () => Promise<UserLocation | undefined>
  supplierMode?: 'explore' | 'requests' | 'my-errands'
  errandApi?: import('./errand/api').ErrandApi
  supplierApi?: import('./supplier/api').SupplierApi
  onErrandAccepted?: () => void
  mapViewport?: MapViewport
  onMapViewportChange?: (viewport: MapViewport) => void
  /** Whether this remote's map is currently visible and can safely apply a viewport. */
  mapActive?: boolean
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
  errand: {
    id: 'errand',
    label: 'Errand service',
    description: 'Create, accept, and track campus errand requests.',
    path: '/errands',
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
export * from './errand'
export * from './credit'
