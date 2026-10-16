import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ErrandApi, ServiceType, Supplier, SupplierApi } from '@relay/contracts'
import { ErrorMessage, LoadingState, RelayButton, RelayFormField, RelayFormSurface } from '@relay/ui'
import { createHttpSupplierApi } from '../supplierApi'
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
  errandApi,
  supplierApi,
}: {
  initialSupplierId?: string
  onClose: () => void
  onCreated: () => void
  errandApi?: ErrandApi
  supplierApi?: SupplierApi
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateForm>({
    name: '', supplierId: initialSupplierId ?? '', serviceType: '', pickupBuildingName: '',
    pickupFloorNumber: '', deliveryBuildingName: '', deliveryFloorNumber: '', description: '',
    instructions: '', creditAmount: '', expiresAt: '',
  })

  useEffect(() => {
    let cancelled = false
    setLoadingSuppliers(true)
    const activeSupplierApi = supplierApi ?? createHttpSupplierApi()
    void activeSupplierApi.getSuppliers().then(({ suppliers: loaded }) => {
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
  }, [initialSupplierId, supplierApi])

  const selectedSupplier = suppliers.find((supplier) => supplier.id === form.supplierId)
  const serviceTypes = useMemo(() => selectedSupplier?.serviceTypes ?? [], [selectedSupplier])
  const update = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }
  const errorFor = (...keys: string[]) => keys.map((key) => fieldErrors[key]).find(Boolean)

  function setSubmissionError(error: unknown) {
    const candidate = error as { message?: string; fieldErrors?: Record<string, string> }
    setErrorMessage(candidate.message ?? 'Unable to create the errand.')
    setFieldErrors(candidate.fieldErrors ?? {})
  }

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
    setFieldErrors({})
    const validationErrors: Record<string, string> = {}
    const creditAmount = Number(form.creditAmount)
    const deadline = form.expiresAt ? new Date(form.expiresAt) : undefined
    if (!form.name.trim()) validationErrors.name = 'Enter an errand name.'
    else if (form.name.trim().length > 200) validationErrors.name = 'Use 200 characters or fewer.'
    if (!form.supplierId) validationErrors.supplierId = 'Select a supplier.'
    if (form.serviceType === '') validationErrors.serviceType = 'Select a service type.'
    else if (selectedSupplier && !selectedSupplier.serviceTypes.includes(form.serviceType)) validationErrors.serviceType = 'This service type is not offered by the selected supplier.'
    if (!form.deliveryBuildingName.trim() || !form.deliveryFloorNumber.trim()) validationErrors.deliveryLocation = 'Enter a delivery building and floor.'
    if (!form.description.trim()) validationErrors.description = 'Enter a description.'
    else if (form.description.trim().length > 5000) validationErrors.description = 'Use 5,000 characters or fewer.'
    if (!form.creditAmount.trim() || !Number.isInteger(creditAmount) || creditAmount < 0) validationErrors.creditAmount = 'Enter a whole number of credits that is 0 or greater.'
    if (!deadline) validationErrors.expiresAt = 'Choose a deadline.'
    else if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) validationErrors.expiresAt = 'Choose a future deadline.'
    if (!selectedSupplier) validationErrors.supplierId = 'Select a supplier.'
    if (!errandApi) setErrorMessage('Errand service is unavailable.')
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setErrorMessage('Check the highlighted fields.')
      return
    }
    if (!errandApi || !selectedSupplier || !deadline) return
    setSubmitting(true)
    void errandApi.createErrand({
      // TODO: persist these temporary fields in the backend errand model.
      name: form.name.trim(),
      supplierId: selectedSupplier.id,
      pickupLocation: selectedSupplier.location,
      deliveryLocation: {
        // TODO: replace placeholder coordinates with target-location integration.
        lat: 0,
        lng: 0,
        buildingName: form.deliveryBuildingName.trim(),
        floorNumber: Number(form.deliveryFloorNumber),
      },
      deliveryDetails: {
        description: form.description.trim(),
        ...(form.instructions.trim() ? { instructions: form.instructions.trim() } : {}),
      },
      creditAmount,
      expiresAt: deadline.toISOString(),
    }).then(() => onCreated()).catch(setSubmissionError).finally(() => setSubmitting(false))
  }

  if (loadingSuppliers) return <LoadingState label="Loading suppliers" />

  return (
    <RelayFormSurface className="create-errand-card relay-mobile-sheet-surface" title="Create an errand" description="Tell us what you need delivered." onClose={onClose}>
      {errorMessage && <ErrorMessage message={errorMessage} />}
      <form className="errand-form" onSubmit={submit}>
        <RelayFormField label="What do you need?" required error={errorFor('name')}><input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Graphing calculator" maxLength={200} /></RelayFormField>
        <RelayFormField label="Supplier" required error={errorFor('supplierId')}><select value={form.supplierId} onChange={(e) => handleSupplierChange(e.target.value)}><option value="">Select a supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></RelayFormField>
        <RelayFormField label="Service type" required error={errorFor('serviceType')}><select value={form.serviceType} onChange={(e) => update('serviceType', e.target.value === '' ? '' : Number(e.target.value) as ServiceType)}><option value="">Select a service type</option>{serviceTypes.map((type) => <option key={type} value={type}>{SERVICE_TYPE_LABELS[type]}</option>)}</select></RelayFormField>
        <div className="errand-form-grid"><label className="errand-field"><span>Pickup building</span><input value={form.pickupBuildingName} onChange={(e) => update('pickupBuildingName', e.target.value)} /></label><label className="errand-field"><span>Floor</span><input inputMode="numeric" value={form.pickupFloorNumber} onChange={(e) => update('pickupFloorNumber', e.target.value)} /></label></div>
        <div className="errand-form-grid"><label className="errand-field"><span>Delivery building</span><input value={form.deliveryBuildingName} onChange={(e) => update('deliveryBuildingName', e.target.value)} placeholder="e.g. Kent Ridge MRT" />{errorFor('deliveryLocation', 'deliveryLocation.buildingName') && <small role="alert">{errorFor('deliveryLocation', 'deliveryLocation.buildingName')}</small>}</label><label className="errand-field"><span>Floor</span><input inputMode="numeric" value={form.deliveryFloorNumber} onChange={(e) => update('deliveryFloorNumber', e.target.value)} />{errorFor('deliveryLocation.floorNumber') && <small role="alert">{errorFor('deliveryLocation.floorNumber')}</small>}</label></div>
        <RelayFormField label="Description" required error={errorFor('description', 'deliveryDetails.description')}><textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe what needs to be picked up or delivered." maxLength={5000} rows={3} /></RelayFormField>
        <label className="errand-field"><span>Instructions <em>Optional</em></span><textarea value={form.instructions} onChange={(e) => update('instructions', e.target.value)} placeholder="Add any handling or collection instructions." rows={2} /></label>
        <div className="errand-form-grid"><label className="errand-field"><span>Reward credits</span><input inputMode="numeric" min="0" step="1" value={form.creditAmount} onChange={(e) => update('creditAmount', e.target.value)} placeholder="15" />{errorFor('creditAmount') && <small role="alert">{errorFor('creditAmount')}</small>}</label><label className="errand-field"><span>Deadline</span><input type="datetime-local" value={form.expiresAt} onChange={(e) => update('expiresAt', e.target.value)} />{errorFor('expiresAt') && <small role="alert">{errorFor('expiresAt')}</small>}</label></div>
        <p className="errand-form-note">Start time is recorded automatically when your request is created.</p>
        <RelayButton variant="primary" type="submit" disabled={submitting}>{submitting ? 'Creating request…' : 'Create request'}</RelayButton>
      </form>
    </RelayFormSurface>
  )
}
