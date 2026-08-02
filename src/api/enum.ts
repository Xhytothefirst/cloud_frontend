import http from './http'
import type { EnumOption } from '../types/api'

export const getPlatforms = (): Promise<EnumOption[]> =>
  http.get<EnumOption[], EnumOption[]>('/enum/platform')

export const getStatuses = (): Promise<EnumOption[]> =>
  http.get<EnumOption[], EnumOption[]>('/enum/status')

export const getOperationTypes = (): Promise<EnumOption[]> =>
  http.get<EnumOption[], EnumOption[]>('/enum/operation-type')