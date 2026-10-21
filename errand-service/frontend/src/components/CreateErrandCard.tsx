import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ErrandApi, ServiceType, Supplier, SupplierApi } from '@relay/contracts'
import {
  ErrorMessage,
  LoadingState,
  RelayButton,
  RelayFormField,
  RelayFormSurface,
} from '@relay/ui'
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
  startAt: string
  expiresAt: string
}

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultStartValue() {
  return formatDateTimeLocal(new Date())
}

function defaultDeadlineValue() {
  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000)
  return formatDateTimeLocal(deadline)
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
    name: '',
    supplierId: initialSupplierId ?? '',
    serviceType: '',
    pickupBuildingName: '',
    pickupFloorNumber: '',
    deliveryBuildingName: '',
    deliveryFloorNumber: '',
    description: '',
    instructions: '',
    creditAmount: '',
    startAt: defaultStartValue(),
    expiresAt: defaultDeadlineValue(),
  })

  useEffect(() => {
    let cancelled = false
    setLoadingSuppliers(true)
    const activeSupplierApi = supplierApi ?? createHttpSupplierApi()
    void activeSupplierApi
      .getSuppliers()
      .then(({ suppliers: loaded }) => {
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
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load suppliers.')
      })
      .finally(() => {
        if (!cancelled) setLoadingSuppliers(false)
      })
    return () => {
      cancelled = true
    }
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
    const start = form.startAt ? new Date(form.startAt) : undefined
    const deadline = form.expiresAt ? new Date(form.expiresAt) : undefined
    if (!form.name.trim()) validationErrors.name = 'Enter an errand name.'
    else if (form.name.trim().length > 200) validationErrors.name = 'Use 200 characters or fewer.'
    if (!form.supplierId) validationErrors.supplierId = 'Select a supplier.'
    if (form.serviceType === '') validationErrors.serviceType = 'Select a service type.'
    else if (selectedSupplier && !selectedSupplier.serviceTypes.includes(form.serviceType))
      validationErrors.serviceType = 'This service type is not offered by the selected supplier.'
    if (!form.deliveryBuildingName.trim()) validationErrors.deliveryBuildingName = 'Enter a delivery building.'
    if (!form.deliveryFloorNumber.trim()) validationErrors.deliveryFloorNumber = 'Enter a delivery floor.'
    else if (!Number.isInteger(Number(form.deliveryFloorNumber)))
      validationErrors.deliveryFloorNumber = 'Floor must be a number.'
    if (!form.description.trim()) validationErrors.description = 'Enter a description.'
    else if (form.description.trim().length > 5000)
      validationErrors.description = 'Use 5,000 characters or fewer.'
    if (!form.creditAmount.trim() || !Number.isInteger(creditAmount) || creditAmount < 0)
      validationErrors.creditAmount = 'Enter a whole number of credits that is 0 or greater.'
    if (!start) validationErrors.startAt = 'Choose a start time.'
    else if (Number.isNaN(start.getTime())) validationErrors.startAt = 'Choose a valid start time.'
    if (!deadline) validationErrors.expiresAt = 'Choose a deadline.'
    else if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now())
      validationErrors.expiresAt = 'Choose a future deadline.'
    if (start && deadline && !Number.isNaN(start.getTime()) && start.getTime() > deadline.getTime())
      validationErrors.startAt = 'Start time must be on or before the deadline.'
    if (!selectedSupplier) validationErrors.supplierId = 'Select a supplier.'
    if (!errandApi) setErrorMessage('Errand service is unavailable.')
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setErrorMessage('Check the highlighted fields.')
      return
    }
    if (!errandApi || !selectedSupplier || !start || !deadline) return
    setSubmitting(true)
    void errandApi
      .createErrand({
        supplierDetails: {
          supplierId: selectedSupplier.id,
          supplierName: selectedSupplier.name,
          serviceType: form.serviceType as ServiceType,
        },
        name: form.name.trim(),
        pickupLocation: selectedSupplier.location,
        targetLocation: {
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
        startAt: start.toISOString(),
        expiresAt: deadline.toISOString(),
      })
      .then(() => onCreated())
      .catch(setSubmissionError)
      .finally(() => setSubmitting(false))
  }

  if (loadingSuppliers) return <LoadingState label="Loading suppliers" />

  return (
    <RelayFormSurface
      className="create-errand-card relay-mobile-sheet-surface"
      title="Create an errand"
      description="Tell us what you need delivered."
      onClose={onClose}
    >
      {errorMessage && <ErrorMessage message={errorMessage} />}
      <form className="errand-form" onSubmit={submit}>
        <RelayFormField label="What do you need?" required error={errorFor('name')}>
          <input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Graphing calculator"
            maxLength={200}
          />
        </RelayFormField>
        <RelayFormField label="Supplier" required error={errorFor('supplierId')}>
          <select required value={form.supplierId} onChange={(e) => handleSupplierChange(e.target.value)}>
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </RelayFormField>
        <RelayFormField label="Service type" required error={errorFor('serviceType')}>
          <select
            required
            value={form.serviceType}
            onChange={(e) =>
              update(
                'serviceType',
                e.target.value === '' ? '' : (Number(e.target.value) as ServiceType),
              )
            }
          >
            <option value="">Select a service type</option>
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {SERVICE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </RelayFormField>
        <div className="errand-form-grid">
          <div className="errand-field">
            <span>Pickup building <b aria-hidden="true">*</b></span>
            <div className="errand-readonly-value">{form.pickupBuildingName}</div>
          </div>
          <div className="errand-field">
            <span>Floor <b aria-hidden="true">*</b></span>
            <div className="errand-readonly-value">Level {form.pickupFloorNumber}</div>
          </div>
        </div>
        <div className="errand-form-grid">
          <label className="errand-field">
            <span>Delivery building <b aria-hidden="true">*</b></span>
            <input
              required
              value={form.deliveryBuildingName}
              onChange={(e) => update('deliveryBuildingName', e.target.value)}
              placeholder="e.g. Kent Ridge MRT"
            />
          </label>
          <label className="errand-field">
            <span>Floor <b aria-hidden="true">*</b></span>
            <input
              type="number"
              required
              step="1"
              value={form.deliveryFloorNumber}
              onChange={(e) => update('deliveryFloorNumber', e.target.value)}
              onInvalid={(e) => {
                e.currentTarget.setCustomValidity(
                  e.currentTarget.value.trim() ? 'Floor must be a number.' : '',
                )
              }}
              onInput={(e) => e.currentTarget.setCustomValidity('')}
            />
          </label>
        </div>
        <RelayFormField
          label="Description"
          required
          error={errorFor('description', 'deliveryDetails.description')}
        >
          <textarea
            required
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Describe what needs to be picked up or delivered."
            maxLength={5000}
            rows={3}
          />
        </RelayFormField>
        <label className="errand-field">
          <span>
            Instructions <em>Optional</em>
          </span>
          <textarea
            value={form.instructions}
            onChange={(e) => update('instructions', e.target.value)}
            placeholder="Add any handling or collection instructions."
            rows={2}
          />
        </label>
        <div className="errand-form-grid errand-reward-grid">
          <label className="errand-field">
            <span>Reward credits</span>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={form.creditAmount}
              onChange={(e) => update('creditAmount', e.target.value)}
              placeholder="15"
            />
          </label>
          <RelayFormField label="Start time" required error={errorFor('startAt')}>
            <input
              type="datetime-local"
              required
              value={form.startAt}
              onChange={(e) => update('startAt', e.target.value)}
            />
          </RelayFormField>
          <label className="errand-field">
            <span>Deadline</span>
            <input
              type="datetime-local"
              required
              value={form.expiresAt}
              onChange={(e) => update('expiresAt', e.target.value)}
            />
          </label>
        </div>
        <RelayButton variant="primary" type="submit" disabled={submitting}>
          {submitting ? 'Creating request…' : 'Create request'}
        </RelayButton>
      </form>
    </RelayFormSurface>
  )
}
