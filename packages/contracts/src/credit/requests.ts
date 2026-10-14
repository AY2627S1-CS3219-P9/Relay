import { TransactionReference } from "./models";

export interface ViewCreditRequest {
  userId: string;
}

export interface ViewCreditHistoryRequest {
  userId: string;
  // TODO: Add filters and limits
}

export interface ReserveCreditRequest {
  transactionReference: TransactionReference;
  userId: string;
  amount: number;
}
