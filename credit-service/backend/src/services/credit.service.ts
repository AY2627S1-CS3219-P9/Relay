import type {
  ViewCreditRequest,
  ViewCreditResponse,
  ViewCreditHistoryRequest,
  ViewCreditHistoryResponse,
} from '@relay/contracts'
import { CreditRepository } from '../repositories/credit.repository.js'
import { CreditServiceError } from '../types/credit.types.js'

export class CreditService {
  constructor(private readonly repository: CreditRepository) {}

  async viewCredit(request: ViewCreditRequest): Promise<ViewCreditResponse> {
    const balance = await this.repository.findBalance(request.userId)
    if (!balance) {
      throw new CreditServiceError('USER_NOT_FOUND', 'The user has no credit balance record.', 404)
    }
    return balance
  }

  async viewCreditHistory(request: ViewCreditHistoryRequest): Promise<ViewCreditHistoryResponse> {
    return { records: await this.repository.findHistory(request.userId) }
  }
}
