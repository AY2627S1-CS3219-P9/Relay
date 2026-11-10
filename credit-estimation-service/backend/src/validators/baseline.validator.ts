import { ServiceType } from '@relay/contracts/supplier'
import { CREDIT_BASELINES, type ServiceTypeBaseline } from '../config/baselines.js'

type BaselineMap = Readonly<Partial<Record<ServiceType, ServiceTypeBaseline>>>

export function assertAllServiceTypesHaveBaselines(
  baselines: BaselineMap = CREDIT_BASELINES,
): void {
  const missingServiceTypes = Object.entries(ServiceType)
    .filter(([, serviceType]) => !Object.prototype.hasOwnProperty.call(baselines, serviceType))
    .map(([name, serviceType]) => `${name} (${serviceType})`)

  if (missingServiceTypes.length > 0) {
    throw new Error(
      `Missing credit estimation baseline for contract service type(s): ${missingServiceTypes.join(', ')}`,
    )
  }
}
