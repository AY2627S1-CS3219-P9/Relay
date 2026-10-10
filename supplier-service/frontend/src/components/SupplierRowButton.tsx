import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { RelayButton, type RelayButtonVariant } from '@relay/ui'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Extract<RelayButtonVariant, 'primary' | 'secondary'>
}

export function SupplierRowButton({
  children,
  className = '',
  variant = 'secondary',
  ...props
}: Props) {
  const styleClass = variant === 'primary' ? 'glass-btn-primary' : 'glass-btn'
  return (
    <RelayButton
      {...props}
      variant={variant}
      scale={1}
      className={`supplier-row-button ${styleClass}${className ? ` ${className}` : ''}`}
    >
      {children}
    </RelayButton>
  )
}
