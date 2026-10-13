import type { Errand, SupplierErrandSummary } from './models'

export type CreateErrandResponse = {
  errand: Errand
}

export type GetErrandsResponse = {
  errands: Errand[]
}

export type GetErrandResponse = {
  errand: Errand
}

export type GetSupplierErrandViewResponse = {
  errands: SupplierErrandSummary[]
}

export type DeleteErrandResponse = undefined
