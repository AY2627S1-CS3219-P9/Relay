import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react'

export type RelayButtonVariant = 'primary' | 'secondary' | 'danger' | 'plain'

export function RelayButton({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: RelayButtonVariant
  children: ReactNode
}) {
  return (
    <button
      {...props}
      className={`relay-button relay-button-${variant}${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`relay-icon-button${className ? ` ${className}` : ''}`}
      aria-label={label}
    >
      {children}
    </button>
  )
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'danger' | 'warning'
}) {
  return <span className={`relay-status-badge relay-status-${tone}`}>{children}</span>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <span className="relay-spinner" role="status" aria-label={label} />
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="relay-loading-state" role="status" aria-label={label}>
      <Spinner label={label} />
    </div>
  )
}

export function GlassWindow({
  children,
  background,
  className = '',
}: {
  children: ReactNode
  background?: ReactNode
  className?: string
}) {
  return (
    <div className={`relay-glass-window${className ? ` ${className}` : ''}`}>
      {background && <div className="relay-glass-window-background">{background}</div>}
      <section className="relay-glass-window-panel glass-card">{children}</section>
    </div>
  )
}

export function GlassCard({
  as = 'div',
  children,
  className = '',
  variant = 'glass',
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'aside' | 'section'
  children: ReactNode
  variant?: 'glass' | 'plain'
}) {
  const Element = as
  return (
    <Element
      {...props}
      className={`${variant === 'glass' ? 'relay-glass-card glass-card' : ''}${className ? ` ${className}` : ''}`.trim()}
    >
      {children}
    </Element>
  )
}

export function SlidingSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel = 'Options',
  className = '',
}: {
  options: ReadonlyArray<{ value: T; label: ReactNode }>
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
  className?: string
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  return (
    <div
      className={`relay-segmented-control${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label={ariaLabel}
      style={
        {
          '--relay-segment-count': options.length,
          '--relay-segment-index': activeIndex,
        } as CSSProperties
      }
    >
      <span className="relay-segmented-indicator" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className="relay-segmented-option"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
