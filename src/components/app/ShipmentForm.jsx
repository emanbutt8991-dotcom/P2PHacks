import { useMemo, useState } from 'react'
import { COUNTRIES } from '../../../shared/countries.js'
import { AIRPORTS, PORTS } from '../../../shared/places.js'
import { CURRENCIES } from '../../data/fxSnapshot.js'
import { MODES, SHIPMENT_STATUSES, statusLabel } from '../../engine/model.js'
import { Button } from '../ui.jsx'
import { Modal, NumberInput, SelectInput, TextInput, useToast } from './kit.jsx'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'

const blank = (ws) => ({
  reference: '', direction: 'import', supplierId: '', productId: '', mode: 'sea', originHub: '', destHub: '', warehouseId: ws.warehouses[0]?.id ?? '',
  destinationCountry: '', carrier: '', weightKg: '', quantity: '', containerNo: '', awb: '', etd: '', eta: '', status: 'booked', cost: '', currency: 'CAD', dataSource: 'manual',
})

export function validateShipment(s) {
  const errors = {}
  if (!s.reference?.trim()) errors.reference = 'Enter a reference.'
  if (s.direction === 'import' && !s.supplierId) errors.supplierId = 'Choose a supplier.'
  if (s.direction === 'export' && !s.destinationCountry) errors.destinationCountry = 'Choose a destination country.'
  if (s.weightKg === '' || !(Number(s.weightKg) > 0)) errors.weightKg = 'Weight is needed to estimate emissions.'
  if (s.cost !== '' && !(Number(s.cost) >= 0)) errors.cost = 'Enter a valid amount.'
  if (s.etd && s.eta && Date.parse(s.eta) < Date.parse(s.etd)) errors.eta = 'Arrival cannot be before departure.'
  return errors
}

export default function ShipmentForm({ open, shipment, onClose }) {
  const { ws, saveRecord } = useWorkspace()
  const toast = useToast()
  const [draft, setDraft] = useState(() => ({ ...blank(ws), ...shipment }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }))

  const hubs = useMemo(() => (draft.mode === 'air' ? AIRPORTS : PORTS).map((p) => ({ value: p.code, label: `${p.name} (${p.code})` })), [draft.mode])
  const longHaul = draft.mode === 'sea' || draft.mode === 'air'

  const submit = async (e) => {
    e.preventDefault()
    const problems = validateShipment(draft)
    setErrors(problems)
    if (Object.keys(problems).length) return
    setSaving(true)
    try {
      const id = draft.id ?? crypto.randomUUID()
      await saveRecord('shipments', { ...draft, id })
      if (!shipment?.id || shipment.status !== draft.status) {
        await saveRecord('events', {
          id: crypto.randomUUID(),
          shipmentId: id,
          at: new Date().toISOString(),
          type: draft.status === 'delayed' ? 'delayed' : draft.status,
          message: `${draft.reference} ${shipment?.id ? 'marked' : 'added as'} ${statusLabel(draft.status).toLowerCase()}`,
          source: 'Manual entry',
          simulated: false,
        })
      }
      if (shipment?.id && shipment.eta !== draft.eta && draft.eta) {
        await saveRecord('events', {
          id: crypto.randomUUID(),
          shipmentId: id,
          at: new Date().toISOString(),
          type: 'eta_update',
          message: `${draft.reference} estimated arrival updated to ${draft.eta}`,
          source: 'Manual entry',
          simulated: false,
        })
      }
      toast(`Shipment ${draft.reference} saved`)
      onClose()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={shipment?.id ? `Edit ${shipment.reference}` : 'Add shipment'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="shipment-form" disabled={saving}>{saving ? 'Saving…' : 'Save shipment'}</Button>
        </>
      }
    >
      <form id="shipment-form" noValidate onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Reference" value={draft.reference} onChange={set('reference')} error={errors.reference} />
        <SelectInput label="Direction" placeholder={null} value={draft.direction} onChange={set('direction')} options={[{ value: 'import', label: 'Import' }, { value: 'export', label: 'Export' }]} />
        {draft.direction === 'import' ? (
          <SelectInput label="Supplier" value={draft.supplierId} onChange={set('supplierId')} error={errors.supplierId} options={ws.suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        ) : (
          <SelectInput label="Destination country" value={draft.destinationCountry} onChange={set('destinationCountry')} error={errors.destinationCountry} options={COUNTRIES.filter((c) => c.code !== 'CA').map((c) => ({ value: c.code, label: c.name }))} />
        )}
        <SelectInput label="Product" optional value={draft.productId} onChange={set('productId')} options={ws.products.map((p) => ({ value: p.id, label: p.name }))} />
        <SelectInput label="Transport mode" placeholder={null} value={draft.mode} onChange={(v) => setDraft((d) => ({ ...d, mode: v, originHub: '', destHub: '' }))} options={MODES} />
        <SelectInput label="Status" placeholder={null} value={draft.status} onChange={set('status')} options={SHIPMENT_STATUSES} />
        {longHaul && (
          <>
            <SelectInput label={draft.mode === 'air' ? 'Origin airport' : 'Origin port'} optional hint="Nearest hub is used if blank" value={draft.originHub} onChange={set('originHub')} options={hubs} />
            <SelectInput label={draft.mode === 'air' ? 'Destination airport' : 'Destination port'} optional hint="Nearest hub is used if blank" value={draft.destHub} onChange={set('destHub')} options={hubs} />
          </>
        )}
        <SelectInput label="Warehouse" optional value={draft.warehouseId} onChange={set('warehouseId')} options={ws.warehouses.map((w) => ({ value: w.id, label: w.name }))} />
        <TextInput label="Carrier" optional value={draft.carrier} onChange={set('carrier')} />
        <NumberInput label="Shipment weight (kg)" value={draft.weightKg} onChange={set('weightKg')} error={errors.weightKg} />
        <NumberInput label="Quantity" optional value={draft.quantity} onChange={set('quantity')} />
        {draft.mode === 'air' ? (
          <TextInput label="Air waybill" optional value={draft.awb} onChange={set('awb')} />
        ) : (
          <TextInput label="Container number" optional value={draft.containerNo} onChange={set('containerNo')} />
        )}
        <div />
        <TextInput label="Departure date" optional type="date" value={draft.etd} onChange={set('etd')} />
        <TextInput label="Expected arrival" optional type="date" value={draft.eta} onChange={set('eta')} error={errors.eta} />
        <NumberInput label="Shipping cost" optional value={draft.cost} onChange={set('cost')} error={errors.cost} />
        <SelectInput label="Currency" placeholder={null} value={draft.currency} onChange={set('currency')} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
      </form>
    </Modal>
  )
}
