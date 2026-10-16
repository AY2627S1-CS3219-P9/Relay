import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { RelayButton, type RelayButtonSize, type RelayButtonVariant } from '@relay/ui'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Extract<RelayButtonVariant, 'primary' | 'secondary'>
  size?: RelayButtonSize
}

export function SupplierRowButton({
  children,
  className = '',
  variant = 'secondary',
  size = 'default',
  ...props
}: Props) {
  const styleClass = variant === 'primary' ? 'glass-btn-primary' : 'glass-btn'
  return (
    <RelayButton
      {...props}
      variant={variant}
      size={size}
      scale={1}
      className={`supplier-row-button ${styleClass}${className ? ` ${className}` : ''}`}
    >
      {children}
    </RelayButton>
  )
}
