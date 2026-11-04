import { ServiceType as SupplierServiceType } from '@relay/contracts/supplier'

export type ServiceTypeBaseline = {
  base: number
  min: number
  max: number
  name: string
}

/** Default baseline for unknown service types */
export const DEFAULT_BASELINE: ServiceTypeBaseline = {
  base: 20,
  min: 15,
  max: 40,
  name: 'Unknown',
}

/** Service type baselines configuration - keyed by supplier service type for extensibility */
export const CREDIT_BASELINES = {
  [SupplierServiceType.Food]: { base: 15, min: 10, max: 30, name: 'Food' },
  [SupplierServiceType.Drink]: { base: 10, min: 8, max: 20, name: 'Drink' },
  [SupplierServiceType.Shopping]: { base: 20, min: 15, max: 40, name: 'Shopping' },
  [SupplierServiceType.Printing]: { base: 10, min: 8, max: 25, name: 'Printing' },
  [SupplierServiceType.Parcel]: { base: 25, min: 15, max: 50, name: 'Parcel' },
} as const

export type CreditBaseline = (typeof CREDIT_BASELINES)[SupplierServiceType]

export function getBaselineForServiceType(serviceType: number): ServiceTypeBaseline {
  const baseline = CREDIT_BASELINES[serviceType as keyof typeof CREDIT_BASELINES] as
    ServiceTypeBaseline | undefined
  return baseline ?? DEFAULT_BASELINE
}

function parseBaseline(value: string): [number, number, number] {
  const [base, min, max] = value.split(',').map((v) => parseInt(v.trim(), 10))
  return [base, min, max]
}

/**
 * Format: BASELINE_<TYPE>=<base>,<min>,<max>
 * e.g., BASELINE_FOOD=15,10,30
 */
export function loadBaselinesFromEnv(): Record<number, ServiceTypeBaseline> {
  // Map env var names to service types
  const baselineConfig: Record<string, number> = {
    baselineFood: SupplierServiceType.Food,
    baselineDrink: SupplierServiceType.Drink,
    baselineShopping: SupplierServiceType.Shopping,
    baselinePrinting: SupplierServiceType.Printing,
    baselineParcel: SupplierServiceType.Parcel,
  }

  const result: Record<number, ServiceTypeBaseline> = {} as Record<number, ServiceTypeBaseline>

  for (const [envKey, serviceType] of Object.entries(baselineConfig)) {
    const envValue = process.env[envKey]
    if (envValue) {
      const [base, min, max] = parseBaseline(envValue)
      result[serviceType] = { base, min, max, name: serviceType.toString() }
    }
  }

  return result
}
