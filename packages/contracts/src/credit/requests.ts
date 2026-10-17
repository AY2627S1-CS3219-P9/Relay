import type { TransactionReference } from './models'

export type ViewCreditRequest = {
  userId: string
}

export type ViewCreditHistoryRequest = {
  userId: string
  // TODO: Add filters and limits
}

export type ReserveCreditRequest = {
  transactionReference: TransactionReference
  userId: string
  amount: number
}
