import http from './http'
import type { OperationLogVO, PageResult } from '../types/api'

export interface LogSearchParams {
  page?: number
  pageSize?: number
  type?: number
  productCode?: string
  productName?: string
}

export const searchLogs = (params: LogSearchParams): Promise<PageResult<OperationLogVO>> =>
  http.get<PageResult<OperationLogVO>, PageResult<OperationLogVO>>('/operation-log/search', { params })

export const getLog = (id: number): Promise<OperationLogVO> =>
  http.get<OperationLogVO, OperationLogVO>(`/operation-log/info/${id}`)

export const undoLog = (id: number): Promise<void> =>
  http.get<void, void>(`/operation-log/undo/${id}`)