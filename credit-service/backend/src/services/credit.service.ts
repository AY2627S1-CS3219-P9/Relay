import type {
  ViewCreditRequest,
  ViewCreditResponse,
  ViewCreditHistoryRequest,
  ViewCreditHistoryResponse,
  AllocateInitialCreditCommand,
  DeleteUserCreditCommand,
  ReleaseCreditCommand,
  ReserveCreditRequest,
  ReserveCreditResponse,
  TransferCreditCommand,
} from '@relay/contracts'
import { CreditRepository } from '../repositories/credit.repository.js'
import { CreditServiceError } from '../types/credit.types.js'

export class CreditService {
  constructor(private readonly repository: CreditRepository) {}

  async findReservation(errandId: string): Promise<{ userId: string; amount: number } | null> {
    return this.repository.findReservation(errandId)
  }

  async allocateInitialCredit(command: AllocateInitialCreditCommand): Promise<void> {
    await this.repository.allocateInitialCredit(command)
  }

  async reserveCredit(request: ReserveCreditRequest): Promise<ReserveCreditResponse> {
    return this.repository.reserveCredit(request)
  }

  async releaseCredit(command: ReleaseCreditCommand): Promise<void> {
    await this.repository.releaseCredit(command)
  }

  async transferCredit(command: TransferCreditCommand): Promise<void> {
    await this.repository.transferCredit(command)
  }

  async deleteUserCredit(command: DeleteUserCreditCommand): Promise<void> {
    await this.repository.deleteUserCredit(command)
  }

  async viewCredit(request: ViewCreditRequest): Promise<ViewCreditResponse> {
    const balance = await this.repository.findBalance(request.userId)
    if (!balance) {
      throw new CreditServiceError('USER_NOT_FOUND', 'The user has no credit balance record.', 404)
    }
    return balance
  }

  async viewCreditHistory(request: ViewCreditHistoryRequest): Promise<ViewCreditHistoryResponse> {
    return { records: await this.repository.findHistory(request.userId, request.offset) }
  }
}
