import type { Errand, ErrandStatus } from '@relay/contracts'

const REQUESTER_STATUS_ORDER: Record<ErrandStatus, number> = {
  OPEN: 0,
  ACCEPTED: 1,
  PICKED_UP: 2,
  DELIVERED: 3,
  CONFIRMED: 4,
  CANCELLED: 5,
  EXPIRED: 6,
}

export function sortRequesterErrands(errands: Errand[]): Errand[] {
  return errands.sort((left, right) => {
    const statusOrder = REQUESTER_STATUS_ORDER[left.status] - REQUESTER_STATUS_ORDER[right.status]
    if (statusOrder !== 0) return statusOrder

    const createdAtOrder = Date.parse(left.createdAt) - Date.parse(right.createdAt)
    if (createdAtOrder !== 0) return createdAtOrder

    return left.id.localeCompare(right.id)
  })
}
