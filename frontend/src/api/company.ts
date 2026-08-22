import { api } from './client'
import type { Company } from '@/types/api'

export interface CompanyUpdate {
  name?: string
  ruc?: string
  address?: string
  currency?: string
  timezone?: string
  decimalSeparator?: '.' | ','
  dateFormat?: string
}

export const companyApi = {
  get: () => api.get<Company>('/company'),
  update: (data: CompanyUpdate) => api.patch<Company>('/company', data),
}
