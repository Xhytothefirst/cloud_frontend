import http from './http'
import type { PageResult, ProductRequest, ProductVO } from '../types/api'

export interface ProductSearchParams {
  code?: string
  name?: string
  size?: string
  status?: number
  brandId?: number
  minPurchasePrice?: number
  maxPurchasePrice?: number
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}

export const searchProducts = (params: ProductSearchParams): Promise<PageResult<ProductVO>> =>
  http.get<PageResult<ProductVO>, PageResult<ProductVO>>('/product/search', { params })

export const getProduct = (id: number): Promise<ProductVO> =>
  http.get<ProductVO, ProductVO>(`/product/info/${id}`)

export const saveProduct = (req: ProductRequest): Promise<number> =>
  http.post<number, number>('/product/save', req)

export const updateProduct = (id: number, req: ProductRequest): Promise<void> =>
  http.post<void, void>(`/product/update/${id}`, req)

export const saleProduct = (id: number, price: number): Promise<void> =>
  http.post<void, void>(`/product/sale/${id}`, null, { params: { price } })

export const deleteProduct = (id: number): Promise<void> =>
  http.post<void, void>(`/product/delete/${id}`)

export const batchDeleteProducts = (ids: number[]): Promise<void> =>
  http.post<void, void>('/product/batch-delete', ids)

export const queryProductsByCode = (code: string): Promise<ProductVO[]> =>
  http.get<ProductVO[], ProductVO[]>('/product/query-by-code', { params: { code } })