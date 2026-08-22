import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyApi } from '@/api/company'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import type { Company } from '@/types/api'

interface FormState {
  name: string; ruc: string; address: string
  currency: string; timezone: string; decimalSeparator: string; dateFormat: string
}

const CURRENCY_OPTIONS = [
  { value: 'PEN', label: 'PEN — Sol Peruano' },
  { value: 'USD', label: 'USD — Dólar Americano' },
  { value: 'EUR', label: 'EUR — Euro' },
]
const TIMEZONE_OPTIONS = [
  { value: 'America/Lima', label: 'Lima (UTC−5)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC−5)' },
  { value: 'America/Santiago', label: 'Santiago (UTC−3)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (UTC−6)' },
]
const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]
const DECIMAL_OPTIONS = [
  { value: '.', label: 'Punto (1,234.56)' },
  { value: ',', label: 'Coma (1.234,56)' },
]

export function SettingsPage() {
  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: companyApi.get,
  })

  if (isLoading || !company) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }

  return <SettingsForm company={company} />
}

function SettingsForm({ company }: { company: Company }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(() => ({
    name: company.name,
    ruc: company.ruc,
    address: company.address ?? '',
    currency: company.currency,
    timezone: company.timezone,
    decimalSeparator: company.decimalSeparator,
    dateFormat: company.dateFormat,
  }))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const updateMutation = useMutation({
    mutationFn: (f: FormState) =>
      companyApi.update({
        name: f.name,
        ruc: f.ruc,
        address: f.address || undefined,
        currency: f.currency,
        timezone: f.timezone,
        decimalSeparator: f.decimalSeparator as '.' | ',',
        dateFormat: f.dateFormat,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: Error) => setError(err.message),
  })

  function set(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }))
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Datos de la Empresa</h2>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
          )}
          {saved && (
            <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
              <span className="material-icons text-base">check_circle</span>
              Cambios guardados correctamente
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); setError(''); updateMutation.mutate(form) }}
            className="space-y-4"
          >
            <Input label="Razón social *" value={form.name} onChange={set('name')} required />
            <Input label="RUC *" value={form.ruc} onChange={set('ruc')} required />
            <Input label="Dirección" value={form.address} onChange={set('address')} />

            <div className="grid grid-cols-2 gap-3">
              <Select label="Moneda" value={form.currency} onChange={set('currency')} options={CURRENCY_OPTIONS} />
              <Select label="Zona horaria" value={form.timezone} onChange={set('timezone')} options={TIMEZONE_OPTIONS} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Separador decimal" value={form.decimalSeparator} onChange={set('decimalSeparator')} options={DECIMAL_OPTIONS} />
              <Select label="Formato de fecha" value={form.dateFormat} onChange={set('dateFormat')} options={DATE_FORMAT_OPTIONS} />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={updateMutation.isPending} icon="save">
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
