import http from './http'
import type { BrandRequest, BrandVO, PageResult } from '../types/api'

export interface BrandSearchParams {
  name?: string
  page?: number
  pageSize?: number
}

export const searchBrands = (params: BrandSearchParams): Promise<PageResult<BrandVO>> =>
  http.get<PageResult<BrandVO>, PageResult<BrandVO>>('/brand/search', { params })

export const getBrand = (id: number): Promise<BrandVO> =>
  http.get<BrandVO, BrandVO>(`/brand/info/${id}`)

export const saveBrand = (req: BrandRequest): Promise<number> =>
  http.post<number, number>('/brand/save', req)

export const updateBrand = (id: number, req: BrandRequest): Promise<void> =>
  http.post<void, void>(`/brand/update/${id}`, req)

export const deleteBrand = (id: number): Promise<void> =>
  http.post<void, void>(`/brand/delete/${id}`)

export const batchDeleteBrands = async (ids: number[]): Promise<void> => {
  await Promise.all(ids.map((id) => deleteBrand(id)))
}

export const listAllBrands = (): Promise<BrandVO[]> =>
  http.get<BrandVO[], BrandVO[]>('/brand/all')