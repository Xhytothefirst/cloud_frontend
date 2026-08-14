import http from './http'
import type { PageResult, RoleRequest, RoleVO } from '../types/api'

export interface RoleSearchParams {
  name?: string
  page?: number
  pageSize?: number
}

export const searchRoles = (params: RoleSearchParams): Promise<PageResult<RoleVO>> =>
  http.get<PageResult<RoleVO>, PageResult<RoleVO>>('/role/search', { params })

export const getRole = (id: number): Promise<RoleVO> =>
  http.get<RoleVO, RoleVO>(`/role/info/${id}`)

export const saveRole = (req: RoleRequest): Promise<number> =>
  http.post<number, number>('/role/save', req)

export const updateRole = (id: number, req: RoleRequest): Promise<void> =>
  http.post<void, void>(`/role/update/${id}`, req)

export const deleteRole = (id: number): Promise<void> =>
  http.post<void, void>(`/role/delete/${id}`)

export const batchDeleteRoles = async (ids: number[]): Promise<void> => {
  await Promise.all(ids.map((id) => deleteRole(id)))
}

export const listAllRoles = (): Promise<RoleVO[]> =>
  http.get<RoleVO[], RoleVO[]>('/role/all')
