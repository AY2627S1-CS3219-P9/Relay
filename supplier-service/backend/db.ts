import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'relay',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

export async function query<T>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}

// ponytail: Using any[] for now - type mapping from DB (snake_case, raw numbers) to
// contracts (camelCase, branded types) requires more work. Keep for future.
export async function getSuppliers(): Promise<any[]> {
  return query('SELECT * FROM suppliers ORDER BY name')
}

export async function getSupplierById(id: string): Promise<any[] | undefined> {
  const rows = await query('SELECT * FROM suppliers WHERE id = $1', [id])
  return rows.length > 0 ? rows : undefined
}

export async function createSupplier(
  name: string,
  location: string,
  isOperational: boolean,
  operatingHours: string,
  serviceTypes: number[],
): Promise<any[]> {
  return query(
    `INSERT INTO suppliers (name, location, is_operational, operating_hours, service_types)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, location, isOperational, operatingHours, serviceTypes],
  )
}

export async function updateSupplier(
  id: string,
  name?: string,
  location?: string,
  isOperational?: boolean,
  operatingHours?: string,
  serviceTypes?: number[],
): Promise<any[]> {
  const updates: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`)
    params.push(name)
  }
  if (location !== undefined) {
    updates.push(`location = $${paramIndex++}`)
    params.push(location)
  }
  if (isOperational !== undefined) {
    updates.push(`is_operational = $${paramIndex++}`)
    params.push(isOperational)
  }
  if (operatingHours !== undefined) {
    updates.push(`operating_hours = $${paramIndex++}`)
    params.push(operatingHours)
  }
  if (serviceTypes !== undefined) {
    updates.push(`service_types = $${paramIndex++}`)
    params.push(serviceTypes)
  }

  if (updates.length === 0) {
    const rows = await getSupplierById(id)
    return rows ?? []
  }

  params.push(id)
  const rows = await query(
    `UPDATE suppliers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params,
  )
  return rows
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM suppliers WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}
