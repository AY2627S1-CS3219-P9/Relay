import { createContext, useContext, type ReactNode } from 'react'
import type { UserApi } from '@relay/contracts'

const UserApiContext = createContext<UserApi | null>(null)

export function UserApiProvider({ api, children }: { api: UserApi; children: ReactNode }) {
  return <UserApiContext.Provider value={api}>{children}</UserApiContext.Provider>
}

export function useUserApi() {
  const api = useContext(UserApiContext)
  if (!api) throw new Error('useUserApi must be used inside UserApiProvider')
  return api
}
