import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react'
import relayHandoffLogo from './assets/relay-handoff.png'

export type RelayButtonVariant = 'primary' | 'secondary' | 'danger' | 'plain'

export function RelayButton({
  variant = 'secondary',
  scale = 1,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: RelayButtonVariant
  scale?: number
  children: ReactNode
}) {
  return (
    <button
      {...props}
      style={{ ...props.style, '--relay-button-scale': scale } as CSSProperties}
      className={`relay-button relay-button-${variant}${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  )
}

export function TextButton({
  className = '',
  children,
  withBounce = true,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; withBounce?: boolean }) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`relay-text-button${withBounce ? ' relay-text-button-bouncy' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  scale = 1,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  scale?: number
  children: ReactNode
}) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      style={{ ...props.style, '--relay-icon-button-scale': scale } as CSSProperties}
      className={`relay-icon-button${className ? ` ${className}` : ''}`}
      aria-label={label}
    >
      {children}
    </button>
  )
}

export function FilterIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 48H480L304 272V432L208 480V272L32 48Z"
        stroke="currentColor"
        strokeWidth="44"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LocationIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 76L156 18C166 13 176 23 171 33L113 157C108 168 92 165 92 153V101H32C20 101 14 84 32 76Z"
        fill="currentColor"
      />
    </svg>
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

export function RelayBrand({ className = '' }: { className?: string }) {
  return (
    <div className={`relay-brand${className ? ` ${className}` : ''}`}>
      <span className="relay-brand-icon" aria-hidden="true">
        <img className="relay-brand-icon-art" src={relayHandoffLogo} alt="" />
      </span>
      <span>Relay</span>
    </div>
  )
}

export function CardView({
  as = 'section',
  children,
  className = '',
  withGlow = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'aside' | 'section'
  children: ReactNode
  withGlow?: boolean
}) {
  const Element = as
  return (
    <Element
      {...props}
      className={`relay-card-view glass-card${withGlow ? ' relay-card-view-with-glow' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </Element>
  )
}

export function GlassWindow({
  children,
  background,
  className = '',
  withGlow = false,
}: {
  children: ReactNode
  background?: ReactNode
  className?: string
  withGlow?: boolean
}) {
  return (
    <div className={`relay-glass-window${className ? ` ${className}` : ''}`}>
      {background && <div className="relay-glass-window-background">{background}</div>}
      <CardView as="section" className="relay-glass-window-panel" withGlow={withGlow}>
        {children}
      </CardView>
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
  scale = 1,
  className = '',
}: {
  options: ReadonlyArray<{ value: T; label: ReactNode }>
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
  scale?: number
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
          '--relay-segment-scale': scale,
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
