import type {
  AddSupplierRequest,
  SessionId,
  Supplier,
  SupplierApi,
  SupplierId,
  UpdateSupplierRequest,
} from '@relay/contracts'

const id = (value: string) => value as SupplierId

const seed: Array<
  [string, string, number, number, number, string, string, boolean, Supplier['serviceTypes']]
> = [
  [
    "Anna's x Soup Union",
    'Central Library',
    1,
    1.296444,
    103.773032,
    '09:00',
    '18:00',
    true,
    ['food-and-beverage'],
  ],
  [
    'NUS Co-op',
    'Central Library',
    1,
    1.2967866,
    103.7732677,
    '09:00',
    '16:00',
    true,
    ['product-purchasing'],
  ],
  ['Printer @ Com 2', 'Com 2', 1, 1.2938347, 103.7744572, '00:00', '23:59', true, ['printing']],
  ['Cool Spot', 'Com 2', 1, 1.2940156, 103.7738478, '09:00', '21:30', true, ['food-and-beverage']],
  [
    'InstaChef',
    'Terrace',
    1,
    1.2938898,
    103.7736305,
    '00:00',
    '23:59',
    true,
    ['food-and-beverage'],
  ],
  [
    'Cafe+ Robot Cafe',
    'Central Library',
    1,
    1.296444,
    103.773032,
    '00:00',
    '23:59',
    false,
    ['food-and-beverage'],
  ],
  [
    'A Hot Hideout',
    "Prince George's Park",
    2,
    1.2908445,
    103.7770891,
    '11:00',
    '21:30',
    true,
    ['food-and-beverage'],
  ],
  [
    'Arise and Shine',
    'Engineering Block E4',
    4,
    1.2991517,
    103.769064,
    '08:00',
    '18:00',
    true,
    ['food-and-beverage'],
  ],
  [
    'Bakehaus / Aurea',
    'The Ridge',
    1,
    1.2946778,
    103.7707872,
    '08:00',
    '21:00',
    true,
    ['food-and-beverage'],
  ],
  [
    'Central Square @ YIH',
    'Yusof Ishak House',
    1,
    1.2984401,
    103.7726256,
    '08:00',
    '20:00',
    false,
    ['food-and-beverage'],
  ],
  [
    'Pasta Express',
    'Frontier',
    1,
    1.2947819,
    103.7704435,
    '09:30',
    '19:30',
    true,
    ['food-and-beverage'],
  ],
  [
    'TOMORO COFFEE',
    'Hon Sui Sen Memorial Library',
    2,
    1.2931259,
    103.7719943,
    '08:15',
    '18:00',
    true,
    ['food-and-beverage'],
  ],
  [
    'Octobox',
    "Prince George's Park",
    2,
    1.2904347,
    103.7787588,
    '00:00',
    '23:59',
    false,
    ['product-purchasing'],
  ],
  ['Smooy', 'COM3', 1, 1.2948308, 103.7716305, '11:00', '21:00', true, ['food-and-beverage']],
  [
    'Goh Bros E-Print Pte Ltd',
    'Yusof Ishak House',
    5,
    1.2984905,
    103.7720544,
    '09:00',
    '18:00',
    true,
    ['printing'],
  ],
  [
    'Cheers Unmanned Convenience Store',
    'Engineering Block E3',
    4,
    1.2994341,
    103.7526298,
    '00:00',
    '23:59',
    true,
    ['product-purchasing'],
  ],
  [
    'Nami',
    'Innovation 4.0',
    1,
    1.2942982,
    103.7708813,
    '08:00',
    '17:30',
    false,
    ['food-and-beverage'],
  ],
  [
    'Supersnacks',
    "Prince George's Park",
    1,
    1.2913847,
    103.7776367,
    '11:00',
    '02:00',
    true,
    ['food-and-beverage'],
  ],
  [
    'Good Day Cafe',
    'Medicine + Science Library',
    1,
    1.2967989,
    103.7794336,
    '07:30',
    '18:30',
    true,
    ['food-and-beverage'],
  ],
  [
    'The Coffee Roaster',
    'Blk AS8',
    1,
    1.296252229,
    103.7720926,
    '08:00',
    '17:30',
    false,
    ['food-and-beverage'],
  ],
  [
    'he by He Brews',
    'Engineering Block EA',
    1,
    1.300566804,
    103.7707577,
    '08:00',
    '17:00',
    true,
    ['food-and-beverage'],
  ],
]

const seedSuppliers: Supplier[] = seed.map(
  (
    [name, buildingName, floorNum, lat, lng, openingTime, closingTime, isOperational, serviceTypes],
    index,
  ) => ({
    id: id(`supplier-${index + 1}`),
    name,
    location: { lat, lng, buildingName, floorNum },
    isOperational,
    operatingHours: {
      openingTime,
      closingTime,
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
    serviceTypes,
  }),
)

function cloneSupplier(supplier: Supplier): Supplier {
  return {
    ...supplier,
    location: { ...supplier.location },
    operatingHours: {
      ...supplier.operatingHours,
      daysOfWeek: [...supplier.operatingHours.daysOfWeek],
    },
    serviceTypes: [...supplier.serviceTypes],
  }
}

export const mockSupplierApi: SupplierApi = {
  async getSuppliers(_sessionId: SessionId) {
    return seedSuppliers.map(cloneSupplier)
  },
  async getSupplier(_sessionId: SessionId, supplierId: SupplierId) {
    const supplier = seedSuppliers.find((candidate) => candidate.id === supplierId)
    if (!supplier) throw new Error('Supplier not found.')
    return cloneSupplier(supplier)
  },
  async addSupplier(_sessionId: SessionId, request: AddSupplierRequest) {
    const supplier: Supplier = { ...request, id: id(`supplier-${crypto.randomUUID()}`) }
    seedSuppliers.push(supplier)
    return cloneSupplier(supplier)
  },
  async updateSupplier(
    _sessionId: SessionId,
    supplierId: SupplierId,
    request: UpdateSupplierRequest,
  ) {
    const index = seedSuppliers.findIndex((candidate) => candidate.id === supplierId)
    if (index < 0) throw new Error('Supplier not found.')
    seedSuppliers[index] = { ...request, id: supplierId }
    return cloneSupplier(seedSuppliers[index])
  },
  async removeSupplier(_sessionId: SessionId, supplierId: SupplierId) {
    const index = seedSuppliers.findIndex((candidate) => candidate.id === supplierId)
    if (index < 0) throw new Error('Supplier not found.')
    seedSuppliers.splice(index, 1)
  },
}

export const mockSessionId = 'supplier-demo-session' as SessionId
