import { TransactionReference } from "./models";

export interface AllocateInitialCreditCommand {
  transactionReference: TransactionReference;
  userId: string;
}

export interface DeleteUserCreditCommand {
  transactionReference: TransactionReference;
  userId: string;
}

export interface ReleaseCreditCommand {
  transactionReference: TransactionReference;
  userId: string;
  amount: number;
}

export interface TransferCreditCommand {
  transactionReference: TransactionReference;
  senderId: string;
  receiverId: string;
  amount: number;
}
