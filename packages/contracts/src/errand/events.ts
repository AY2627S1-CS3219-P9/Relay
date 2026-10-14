import { Errand } from "./models"

type ErrandEvent = {
  errand: Errand
}

export type ErrandCreatedEvent = ErrandEvent
export type ErrandConfirmedEvent = ErrandEvent
export type ErrandCancelledEvent = ErrandEvent
export type ErrandExpiredEvent = ErrandEvent