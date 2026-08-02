<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VueUiDonut, VueUiQuickChart } from 'vue-data-ui'
import type { VueUiDonutConfig, VueUiQuickChartConfig } from 'vue-data-ui'
import {
  getDistribution,
  getSummary,
  getTrend,
  getWarn,
  type TrendDay,
} from '../api/statistic'
import type {
  ProductDistributionVO,
  ProductSummaryVO,
  ProductTrendPeriodVO,
  ProductWarnVO,
} from '../types/api'

const activeTrend = ref<TrendDay>(90)

const summary = ref<ProductSummaryVO | null>(null)
const trend = ref<ProductTrendPeriodVO | null>(null)
const todayTrend = ref<ProductTrendPeriodVO | null>(null)
const warn = ref<ProductWarnVO | null>(null)
const distribution = ref<ProductDistributionVO[]>([])

const loadingSummary = ref(false)
const loadingTrend = ref(false)
const loadingWarn = ref(false)
const loadingDistribution = ref(false)
const globalError = ref<string>('')

const distributionDataset = computed(() =>
  distribution.value.map((d) => ({
    name: d.priceLevel,
    values: [Number(d.count)],
  })),
)

const distributionConfig = ref<VueUiDonutConfig>({
  pie: false,
  responsive: true,
  theme: '',
  customPalette: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#C0C4CC'],
  userOptions: { show: false },
  style: {
    chart: {
      title: { text: '', color: '#303133' },
      legend: { show: true, position: 'top' },
      tooltip: { show: true },
      backgroundColor: 'transparent',
      layout: {
        labels: {
          hollow: {
            average: { show: false },
          },
        },
      },
    },
  },
})

const trendDayLabels = computed(() =>
  (trend.value?.dataOfDay ?? []).map((d) => d.date?.substring(5) ?? ''),
)

const purchaseLineDataset = computed<number[]>(() =>
  (trend.value?.dataOfDay ?? []).map((d) => Number(d.productCount ?? 0)),
)

const saleLineDataset = computed<number[]>(() =>
  (trend.value?.dataOfDay ?? []).map((d) => Number(d.saleProductCount ?? 0)),
)

const profitLineDataset = computed<number[]>(() =>
  (trend.value?.dataOfDay ?? []).map((d) => Number(d.profit ?? 0)),
)

const buildLineConfig = (
  color: string,
  periods: string[],
  modulo: number,
): VueUiQuickChartConfig => ({
  responsive: true,
  theme: '',
  backgroundColor: 'transparent',
  showUserOptions: false,
  showLegend: false,
  showDataLabels: false,
  showTooltip: true,
  zoomXy: false,
  title: '',
  color,
  lineSmooth: true,
  lineStrokeWidth: 2,
  lineAnimated: true,
  xyShowAxis: true,
  xyShowGrid: false,
  xyShowScale: true,
  xyScaleSegments: 4,
  xyPeriods: periods,
  xyPeriodsShowOnlyAtModulo: true,
  xyPeriodsModulo: modulo,
  xyLabelsXFontSize: 10,
  xyLabelsYFontSize: 10,
  xyPaddingTop: 8,
  xyPaddingRight: 8,
  xyPaddingBottom: 18,
  xyPaddingLeft: 32,
  tooltipFontSize: 11,
  formatter: ({ value }) => (Number.isInteger(value) ? String(value) : ''),
})

const trendConfigs = computed(() => {
  const labels = trendDayLabels.value
  const days = trend.value?.dataOfDay?.length ?? 0
  const modulo = days > 7 ? 6 : 7
  return {
    purchase: buildLineConfig('#409EFF', labels, modulo),
    sale: buildLineConfig('#67C23A', labels, modulo),
    profit: buildLineConfig('#E6A23C', labels, modulo),
  }
})

const metrics = computed(() => [
  {
    title: '当前库存',
    numeric: Number(summary.value?.totalProductCount ?? 0),
    prefix: '',
    hint: '可售库存',
  },
  {
    title: '库存总成本',
    numeric: Number(summary.value?.totalPurchasePrice ?? 0),
    prefix: '¥',
    hint: '按入库成本计算',
  },
  {
    title: '今日入库',
    numeric: Number(todayTrend.value?.totalProductCount ?? 0),
    prefix: '',
    hint: '今日新录入（含累计至今日）',
  },
  {
    title: '今日利润',
    numeric: Number(todayTrend.value?.totalProfit ?? 0),
    prefix: '¥',
    hint: '已售订单（含累计至今日）',
  },
])

const trendMetrics = computed(() => {
  const days = activeTrend.value
  const totalProduct = Number(trend.value?.totalProductCount ?? 0)
  const totalSale = Number(trend.value?.totalSaleProductCount ?? 0)
  const totalProfit = Number(trend.value?.totalProfit ?? 0)
  return [
    {
      title: `近${days}天入库`,
      numeric: totalProduct,
      display: `${totalProduct} 双`,
      tag: 'down' as const,
      hasData: purchaseLineDataset.value.length > 0,
      dataset: purchaseLineDataset.value,
      config: trendConfigs.value.purchase,
    },
    {
      title: `近${days}天售出`,
      numeric: totalSale,
      display: `${totalSale} 双`,
      tag: 'up' as const,
      hasData: saleLineDataset.value.length > 0,
      dataset: saleLineDataset.value,
      config: trendConfigs.value.sale,
    },
    {
      title: `近${days}天利润`,
      numeric: totalProfit,
      display: `¥${totalProfit.toLocaleString('zh-CN')}`,
      tag: 'currency' as const,
      hasData: profitLineDataset.value.length > 0,
      dataset: profitLineDataset.value,
      config: trendConfigs.value.profit,
    },
  ]
})

const warnBuckets = computed(() => {
  const w = warn.value
  if (!w) {
    return []
  }
  return [
    { label: '0–30 天', count: w.thirtyDayCount },
    { label: '30–60 天', count: w.sixtyDayCount },
    { label: '60–90 天', count: w.ninetyDayCount },
    { label: '90 天以上', count: w.overNinetyDayCount },
  ]
})

const fetchSummary = async () => {
  loadingSummary.value = true
  try {
    const data = await getSummary()
    summary.value = data
  } catch (err) {
    globalError.value = (err as Error).message
  } finally {
    loadingSummary.value = false
  }
}

const fetchTrend = async (day: TrendDay) => {
  loadingTrend.value = true
  try {
    const data = await getTrend(day)
    trend.value = data
  } catch (err) {
    ElMessage.error((err as Error).message)
  } finally {
    loadingTrend.value = false
  }
}

const fetchTodayTrend = async () => {
  try {
    const data = await getTrend(0)
    todayTrend.value = data
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const fetchWarn = async () => {
  loadingWarn.value = true
  try {
    const data = await getWarn()
    warn.value = data
  } catch (err) {
    ElMessage.error((err as Error).message)
  } finally {
    loadingWarn.value = false
  }
}

const fetchDistribution = async () => {
  loadingDistribution.value = true
  try {
    const data = await getDistribution()
    distribution.value = data
  } catch (err) {
    ElMessage.error((err as Error).message)
  } finally {
    loadingDistribution.value = false
  }
}

const refreshAll = () => {
  globalError.value = ''
  void fetchSummary()
  void fetchTodayTrend()
  void fetchTrend(activeTrend.value)
  void fetchWarn()
  void fetchDistribution()
}

onMounted(refreshAll)

watch(activeTrend, (value) => {
  void fetchTrend(value)
})
</script>

<template>
  <el-container direction="vertical" :style="{ gap: '16px', height: '100%' }">
    <el-alert
      v-if="globalError"
      :title="globalError"
      type="error"
      show-icon
      closable
      :style="{ flex: '0 0 auto' }"
      @close="globalError = ''"
    />

    <el-row :gutter="12" v-loading="loadingSummary" :style="{ flex: '0 0 auto' }">
      <el-col v-for="item in metrics" :key="item.title" :span="6" :style="{ height: '100%' }">
        <el-card
          shadow="hover"
          :body-style="{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }"
          :style="{ height: '100%' }"
        >
          <div>{{ item.title }}</div>
          <el-statistic :value="item.numeric" :prefix="item.prefix" :value-style="{ fontSize: '22px' }" />
          <el-text type="success" size="small">{{ item.hint }}</el-text>
        </el-card>
      </el-col>
    </el-row>

    <el-card
      :body-style="{ padding: '8px 16px', display: 'flex', alignItems: 'center' }"
      :style="{ flex: '0 0 auto' }"
    >
      <el-row justify="space-between" align="middle" :style="{ width: '100%' }">
        <el-col :span="12">
          <strong>开始入库</strong>
          <el-text type="info" size="small">新增球鞋、成本、尺码和库位</el-text>
        </el-col>
        <el-col :span="12" :style="{ textAlign: 'right' }">
          <el-button type="primary" plain @click="$router.push('/inbound')">立即入库</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="12" :style="{ flex: 1, minHeight: 0 }">
      <el-col :span="16" :style="{ height: '100%' }">
        <el-card
          v-loading="loadingTrend"
          :header-style="{ padding: '8px 12px' }"
          :body-style="{ padding: '12px', display: 'flex', flexDirection: 'column' }"
          :style="{ height: '100%' }"
        >
          <template #header>
            <el-row justify="space-between" align="middle">
              <el-col>
                <strong>经营趋势</strong>
                <el-text type="info" size="small">近{{ activeTrend }}天入库、售出与利润分别展示</el-text>
              </el-col>
              <el-col>
                <el-radio-group v-model="activeTrend" size="small">
                  <el-radio-button :value="7">7天</el-radio-button>
                  <el-radio-button :value="30">30天</el-radio-button>
                  <el-radio-button :value="90">90天</el-radio-button>
                </el-radio-group>
              </el-col>
            </el-row>
          </template>

          <el-row :gutter="12" :style="{ flex: 1, minHeight: 0 }">
            <el-col v-for="item in trendMetrics" :key="item.title" :span="8" :style="{ height: '100%' }">
              <el-card
                shadow="never"
                :header-style="{ padding: '6px 10px' }"
                :body-style="{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }"
                :style="{ height: '100%' }"
              >
                <template #header>
                  <el-row justify="space-between" align="middle">
                    <el-col><strong>{{ item.title }}</strong></el-col>
                    <el-col>
                      <el-space :size="6" align="center">
                        <el-tag v-if="item.tag === 'down'" type="info" effect="plain">↓</el-tag>
                        <el-tag v-else-if="item.tag === 'up'" type="success" effect="plain">↑</el-tag>
                        <el-tag v-else type="warning" effect="plain">¥</el-tag>
                        <span :style="{ fontSize: '14px', fontWeight: 600 }">{{ item.display }}</span>
                      </el-space>
                    </el-col>
                  </el-row>
                </template>
                <div :style="{ height: '150px', marginTop: 'auto' }">
                  <VueUiQuickChart
                    v-if="item.hasData"
                    :config="item.config"
                    :dataset="item.dataset"
                  />
                  <el-empty v-else :image-size="40" description="暂无数据" />
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-col>

      <el-col :span="8" :style="{ height: '100%' }">
        <el-card
          v-loading="loadingDistribution"
          :header-style="{ padding: '8px 12px' }"
          :body-style="{ padding: '12px', display: 'flex', alignItems: 'stretch', flexDirection: 'column' }"
          :style="{ height: '100%' }"
        >
          <template #header><strong>成本价位分布</strong></template>
          <div :style="{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
            <VueUiDonut
              v-if="distributionDataset.length > 0"
              :config="distributionConfig"
              :dataset="distributionDataset"
            />
            <el-empty v-else description="暂无分布数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card
      v-loading="loadingWarn"
      :header-style="{ padding: '8px 12px' }"
      :body-style="{ padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }"
      :style="{ flex: '0 0 auto' }"
    >
      <template #header>
        <el-row justify="space-between" align="middle">
          <el-col><strong>库龄预警</strong></el-col>
          <el-col>
            <el-tag type="danger" effect="plain">
              超期 {{ warn?.overNinetyDayCount ?? 0 }} 双
            </el-tag>
          </el-col>
        </el-row>
      </template>
      <el-descriptions :column="4" border>
        <el-descriptions-item
          v-for="bucket in warnBuckets"
          :key="bucket.label"
          :label="bucket.label"
          :label-style="{ padding: '4px 8px' }"
        >
          {{ bucket.count }} 双
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </el-container>
</template>