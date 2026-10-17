import '@relay/ui/styles.css'
import './styles.css'
import { useEffect, useState } from 'react'
import type { RemoteAppProps, TransactionRecord, ViewCreditHistoryResponse } from '@relay/contracts'
import { ErrorMessage, IconButton, RelayButton } from '@relay/ui'
import { HISTORY_PAGE_SIZE, transactionDisplay, transactionTime } from './history'

export default function App({
  creditBalance,
  authenticatedSubject,
  authVersion,
  closeCredit,
  creditHistoryOpen = false,
  showCreditHistory,
  showCreditBalance,
}: RemoteAppProps) {
  const [records, setRecords] = useState<TransactionRecord[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    if (!creditHistoryOpen) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setRecords([])
    void fetch('/api/credit/history', {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Credit history request failed (${response.status}).`)
        return (await response.json()) as ViewCreditHistoryResponse
      })
      .then(({ records: fetchedRecords }) => {
        if (!Array.isArray(fetchedRecords)) throw new Error('Credit history response is invalid.')
        if (!controller.signal.aborted) setRecords(fetchedRecords)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Unable to load credit history.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [creditHistoryOpen, authenticatedSubject, authVersion, retryVersion])

  const pageCount = Math.max(1, Math.ceil(records.length / HISTORY_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleRecords = records.slice((currentPage - 1) * HISTORY_PAGE_SIZE, currentPage * HISTORY_PAGE_SIZE)
  const userId = creditBalance?.userId ?? authenticatedSubject ?? ''

  return (
    <section className={`credit-profile-content relay-design-system${creditHistoryOpen ? ' credit-history-screen' : ''}`} aria-label="Credits">
      <div className="credit-view credit-balance-view" aria-hidden={creditHistoryOpen} inert={creditHistoryOpen}>
        <header className="credit-profile-header">
          <h1>Credits</h1>
          <IconButton label="Close credits" onClick={closeCredit}>&times;</IconButton>
        </header>
        <div className="credit-balance-grid">
          <div className="relay-glass-soft">
            <span>Available balance</span>
            <strong>{creditBalance?.availableCredit ?? '...'} cr</strong>
          </div>
          <div className="relay-glass-soft">
            <span>Reserve balance</span>
            <strong>{creditBalance?.reserveCredit ?? '...'} cr</strong>
          </div>
        </div>
        <RelayButton variant="secondary" className="credit-history-button" onClick={() => {
          setPage(1)
          showCreditHistory?.()
        }}>
          View credit history
        </RelayButton>
      </div>
      <div className="credit-view credit-history-view" aria-hidden={!creditHistoryOpen} inert={!creditHistoryOpen}>
        <header className="credit-profile-header">
          <div className="credit-history-title">
            <IconButton label="Go back" onClick={showCreditBalance}>&larr;</IconButton>
            <h1>Credit history</h1>
          </div>
          <IconButton label="Close credits" onClick={closeCredit}>&times;</IconButton>
        </header>
        {creditHistoryOpen && (
          <>
            {loading && <p className="credit-history-state" role="status">Loading transactions...</p>}
            {!loading && error && (
              <div className="credit-history-state">
                <ErrorMessage message={error} />
                <RelayButton onClick={() => setRetryVersion((current) => current + 1)}>Try again</RelayButton>
              </div>
            )}
            {!loading && !error && records.length === 0 && (
              <p className="credit-history-state">No credit transactions yet.</p>
            )}
            {!loading && !error && records.length > 0 && (
              <>
                <div className="credit-history-table-scroll">
                  <table className="credit-history-table">
                    <thead><tr><th scope="col">Time</th><th scope="col">Transaction</th><th scope="col">Amount</th></tr></thead>
                    <tbody>
                      {visibleRecords.map((record) => {
                        const display = transactionDisplay(record, userId)
                        return (
                          <tr key={`${record.reference.service}:${record.reference.id}:${record.type}`}>
                            <td><time dateTime={String(record.time)}>{transactionTime(record.time)}</time></td>
                            <td>{display.type}</td>
                            <td className={`credit-amount credit-amount-${display.tone}`}>{display.amount}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <nav className="credit-history-pagination" aria-label="Credit history pages">
                  <RelayButton disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</RelayButton>
                  <span>Page {currentPage} of {pageCount}</span>
                  <RelayButton disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</RelayButton>
                </nav>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}