import http from './http'
import type {
  ProductDistributionVO,
  ProductSummaryVO,
  ProductTrendPeriodVO,
  ProductWarnVO,
} from '../types/api'

export type TrendDay = 0 | 7 | 30 | 90

export const getSummary = (): Promise<ProductSummaryVO> =>
  http.get<ProductSummaryVO, ProductSummaryVO>('/statistic/summary')

export const getTrend = (day: TrendDay): Promise<ProductTrendPeriodVO> =>
  http.get<ProductTrendPeriodVO, ProductTrendPeriodVO>('/statistic/trend', { params: { day } })

export const getWarn = (): Promise<ProductWarnVO> =>
  http.get<ProductWarnVO, ProductWarnVO>('/statistic/warn')

export const getDistribution = (): Promise<ProductDistributionVO[]> =>
  http.get<ProductDistributionVO[], ProductDistributionVO[]>('/statistic/distribution')