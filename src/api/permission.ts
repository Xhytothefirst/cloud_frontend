import http from './http'
import type { PermissionVO } from '../types/api'

export const listAllPermissions = (): Promise<PermissionVO[]> =>
  http.get<PermissionVO[], PermissionVO[]>('/permission/all')
