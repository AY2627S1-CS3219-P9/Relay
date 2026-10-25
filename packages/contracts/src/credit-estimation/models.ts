import type { ServiceType as SupplierServiceType } from '../supplier/models'

/** Service type baseline configuration. */
export type ServiceTypeBaseline = {
  base: number
  min: number
  max: number
  name: string
}

/** Service type baselines configuration. */
export const CREDIT_BASELINES = {
  0: { base: 15, min: 10, max: 30, name: 'Food' },
  1: { base: 10, min: 8, max: 20, name: 'Drink' },
  2: { base: 20, min: 15, max: 40, name: 'Shopping' },
  3: { base: 10, min: 8, max: 25, name: 'Printing' },
  4: { base: 25, min: 15, max: 50, name: 'Parcel' },
} as const

export type CreditBaseline = typeof CREDIT_BASELINES[keyof typeof CREDIT_BASELINES]
