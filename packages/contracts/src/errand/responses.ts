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
