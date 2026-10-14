import type { CreditBalance, TransactionRecord } from "./models";

export type ViewCreditResponse = CreditBalance

export type ViewCreditHistoryResponse = {
  records: Array<TransactionRecord>
}

export type ReserveCreditResponse = CreditBalance & {
  status: 'RESERVE_SUCCESS' | 'ALREADY_RESERVED';
}

