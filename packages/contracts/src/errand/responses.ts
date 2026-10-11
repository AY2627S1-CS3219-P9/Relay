import type { Errand } from './models'

export type CreateErrandResponse = {
  errand: Errand
}

export type GetErrandsResponse = {
  errands: Errand[]
}

export type GetErrandResponse = {
  errand: Errand
}

export type DeleteErrandResponse = undefined

/** Response from supplier event processing. */
export type SupplierEventsResponse = {
  processed: boolean
  affectedErrandIds: string[]
}
