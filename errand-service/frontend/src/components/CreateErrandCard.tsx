import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ServiceType, Supplier } from '@relay/contracts'
import { ErrorMessage, LoadingState, RelayButton, RelayFormField, RelayFormSurface } from '@relay/ui'
import { httpSupplierApi } from '../supplierApi'
import { SERVICE_TYPE_LABELS } from '../types'

type CreateForm = {
  name: string
  supplierId: string
  serviceType: ServiceType | ''
  pickupBuildingName: string
  pickupFloorNumber: string
  deliveryBuildingName: string
  deliveryFloorNumber: string
  description: string
  instructions: string
  creditAmount: string
  expiresAt: string
}

export function CreateErrandCard({
  initialSupplierId,
  onClose,
  onCreated,
}: {
  initialSupplierId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateForm>({
    name: '', supplierId: initialSupplierId ?? '', serviceType: '', pickupBuildingName: '',
    pickupFloorNumber: '', deliveryBuildingName: '', deliveryFloorNumber: '', description: '',
    instructions: '', creditAmount: '', expiresAt: '',
  })

  useEffect(() => {
    let cancelled = false
    setLoadingSuppliers(true)
    // Supplier selection is intentionally owned by this remote and uses the Supplier Service API.
    void httpSupplierApi.getSuppliers().then(({ suppliers: loaded }) => {
      if (cancelled) return
      setSuppliers(loaded)
      const selected = loaded.find((supplier) => supplier.id === initialSupplierId) ?? loaded[0]
      if (selected) {
        setForm((current) => ({
          ...current,
          supplierId: selected.id,
          serviceType: selected.serviceTypes[0] ?? '',
          pickupBuildingName: selected.location.buildingName,
          pickupFloorNumber: String(selected.location.floorNumber),
        }))
      }
    }).catch((error: unknown) => {
      if (!cancelled) setErrorMessage(error instanceof Error ? error.message : 'Unable to load suppliers.')
    }).finally(() => { if (!cancelled) setLoadingSuppliers(false) })
    return () => { cancelled = true }
  }, [initialSupplierId])

  const selectedSupplier = suppliers.find((supplier) => supplier.id === form.supplierId)
  const serviceTypes = useMemo(() => selectedSupplier?.serviceTypes ?? [], [selectedSupplier])
  const update = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => setForm((current) => ({ ...current, [key]: value }))

  function handleSupplierChange(supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId)
    update('supplierId', supplierId)
    update('serviceType', supplier?.serviceTypes[0] ?? '')
    if (supplier) {
      update('pickupBuildingName', supplier.location.buildingName)
      update('pickupFloorNumber', String(supplier.location.floorNumber))
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    if (!form.name.trim() || !form.supplierId || form.serviceType === '' || !form.description.trim() || !form.deliveryBuildingName) {
      setErrorMessage('Complete the request name, supplier, service type, delivery location, and description.')
      return
    }
    setSubmitting(true)
    // TODO: call Errand Service createErrand once the finalized F11 request contract is available.
    window.setTimeout(() => {
      setSubmitting(false)
      onCreated()
    }, 450)
  }

  if (loadingSuppliers) return <LoadingState label="Loading suppliers" />

  return (
    <RelayFormSurface className="create-errand-card relay-mobile-sheet-surface" title="Create an errand" description="Tell us what you need delivered." onClose={onClose}>
      {errorMessage && <ErrorMessage message={errorMessage} />}
      <form className="errand-form" onSubmit={submit}>
        <RelayFormField label="What do you need?" required><input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Graphing calculator" maxLength={120} /></RelayFormField>
        <RelayFormField label="Supplier" required><select value={form.supplierId} onChange={(e) => handleSupplierChange(e.target.value)}><option value="">Select a supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></RelayFormField>
        <RelayFormField label="Service type" required><select value={form.serviceType} onChange={(e) => update('serviceType', e.target.value === '' ? '' : Number(e.target.value) as ServiceType)}><option value="">Select a service type</option>{serviceTypes.map((type) => <option key={type} value={type}>{SERVICE_TYPE_LABELS[type]}</option>)}</select></RelayFormField>
        <div className="errand-form-grid"><label className="errand-field"><span>Pickup building</span><input value={form.pickupBuildingName} onChange={(e) => update('pickupBuildingName', e.target.value)} /></label><label className="errand-field"><span>Floor</span><input inputMode="numeric" value={form.pickupFloorNumber} onChange={(e) => update('pickupFloorNumber', e.target.value)} /></label></div>
        <div className="errand-form-grid"><label className="errand-field"><span>Delivery building</span><input value={form.deliveryBuildingName} onChange={(e) => update('deliveryBuildingName', e.target.value)} placeholder="e.g. Kent Ridge MRT" /></label><label className="errand-field"><span>Floor</span><input inputMode="numeric" value={form.deliveryFloorNumber} onChange={(e) => update('deliveryFloorNumber', e.target.value)} /></label></div>
        <RelayFormField label="Description" required><textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe what needs to be picked up or delivered." maxLength={5000} rows={3} /></RelayFormField>
        <label className="errand-field"><span>Instructions <em>Optional</em></span><textarea value={form.instructions} onChange={(e) => update('instructions', e.target.value)} placeholder="Add any handling or collection instructions." rows={2} /></label>
        <div className="errand-form-grid"><label className="errand-field"><span>Reward credits</span><input inputMode="numeric" value={form.creditAmount} onChange={(e) => update('creditAmount', e.target.value)} placeholder="15" /></label><label className="errand-field"><span>Deadline</span><input type="datetime-local" value={form.expiresAt} onChange={(e) => update('expiresAt', e.target.value)} /></label></div>
        <p className="errand-form-note">Start time is recorded automatically when your request is created.</p>
        <RelayButton variant="primary" type="submit" disabled={submitting}>{submitting ? 'Creating request…' : 'Create request'}</RelayButton>
      </form>
    </RelayFormSurface>
  )
}
