import { ServiceType } from '@relay/contracts'
import type { DemoErrand } from './types'

const inHours = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

export const demoErrands: DemoErrand[] = [
  {
    id: 'demo-graphing-calculator',
    name: 'Graphing Calculator',
    serviceType: ServiceType.Shopping,
    pickupLocation: { lat: 1.2916, lng: 103.7762, buildingName: "Prince George's Park", floorNumber: 1 },
    deliveryLocation: { lat: 1.2961, lng: 103.7708, buildingName: 'Kent Ridge MRT', floorNumber: 1 },
    description: 'Please grab the Casio FX-9750GIII from the common room locker.',
    instructions: 'Locker code: 2847. Handle with care — it is needed for finals.',
    creditAmount: 15,
    status: 'OPEN',
    expiresAt: inHours(6),
    confirmationDeadline: null,
  },
  {
    id: 'demo-printing',
    name: 'Print lecture notes',
    serviceType: ServiceType.Printing,
    pickupLocation: { lat: 1.294, lng: 103.7744, buildingName: 'COM2', floorNumber: 1 },
    deliveryLocation: { lat: 1.296, lng: 103.773, buildingName: 'Central Library', floorNumber: 1 },
    description: 'Print and collect the prepared lecture notes.',
    instructions: 'Keep the pages flat.',
    creditAmount: 8,
    status: 'OPEN',
    expiresAt: inHours(3),
    confirmationDeadline: null,
  },
  {
    id: 'demo-active',
    name: 'Grocery pickup',
    serviceType: ServiceType.Food,
    pickupLocation: { lat: 1.2994, lng: 103.7526, buildingName: 'Engineering Block E3', floorNumber: 4 },
    deliveryLocation: { lat: 1.2967, lng: 103.7794, buildingName: 'Medicine Library', floorNumber: 2 },
    description: 'Pick up a small grocery bag and bring it to the library.',
    instructions: 'Please keep chilled items upright.',
    creditAmount: 12,
    status: 'ACCEPTED',
    expiresAt: inHours(4),
    confirmationDeadline: null,
    courierName: 'Ryan',
  },
]
