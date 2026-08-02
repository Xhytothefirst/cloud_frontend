<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { searchLogs, undoLog, type LogSearchParams } from '../api/operationLog'
import { getOperationTypes } from '../api/enum'
import type { EnumOption, OperationLogVO } from '../types/api'

const loading = ref(false)
const list = ref<OperationLogVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const operationTypes = ref<EnumOption[]>([])
const operationTypeMap = computed(() => {
  const m = new Map<number, string>()
  operationTypes.value.forEach((t) => m.set(t.code, t.name))
  return m
})

const codeKeyword = ref<string>('')
const nameKeyword = ref<string>('')
const typeFilter = ref<number | null>(null)
const searchTimer = ref<number | null>(null)

const typeTagType = (code: number): 'primary' | 'success' | 'danger' => {
  if (code === 1) return 'primary'
  if (code === 2) return 'success'
  return 'danger'
}

const fetchEnums = async () => {
  operationTypes.value = await getOperationTypes()
}

const fetchList = async () => {
  loading.value = true
  try {
    const params: LogSearchParams = { page: page.value, pageSize: pageSize.value }
    if (typeFilter.value !== null && typeFilter.value !== undefined) {
      params.type = typeFilter.value
    }
    const code = codeKeyword.value.trim()
    const name = nameKeyword.value.trim()
    if (code) params.productCode = code
    if (name) params.productName = name
    const data = await searchLogs(params)
    list.value = data.records
    total.value = data.total
  } catch (err) {
    ElMessage.error((err as Error).message)
  } finally {
    loading.value = false
  }
}

const onSearchInput = () => {
  if (searchTimer.value) {
    window.clearTimeout(searchTimer.value)
  }
  searchTimer.value = window.setTimeout(() => {
    page.value = 1
    void fetchList()
  }, 300)
}

const onTypeChange = () => {
  page.value = 1
  void fetchList()
}

const onPageChange = (p: number) => {
  page.value = p
  void fetchList()
}

const onSizeChange = (s: number) => {
  pageSize.value = s
  page.value = 1
  void fetchList()
}

const refresh = () => {
  void fetchList()
}

const formatMoney = (n: number | null | undefined) =>
  `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const operationTimeText = (row: OperationLogVO) => row.createTime ?? '—'

const profitOf = (row: OperationLogVO): number | null => {
  if (row.productProfit === null || row.productProfit === undefined) return null
  return row.productProfit
}

const canUndo = (row: OperationLogVO): boolean => {
  const code = row.operationType
  return code === 2 || code === 3
}

const undoLabel = (row: OperationLogVO): string => {
  const code = row.operationType
  if (code === 2) return '撤回已售'
  if (code === 3) return '撤回删除'
  return ''
}

const handleUndo = async (row: OperationLogVO) => {
  try {
    await undoLog(row.id)
    ElMessage.success('已撤回')
    await fetchList()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const confirmAndUndo = async (row: OperationLogVO) => {
  try {
    await ElMessageBox.confirm(
      '此操作将还原该日志对应的影响（如恢复已售状态、恢复已删除记录）',
      '确认撤回该操作？',
      {
        confirmButtonText: '撤回',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  await handleUndo(row)
}

onMounted(async () => {
  await fetchEnums()
  await fetchList()
})
</script>

<template>
  <div :style="{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }">
    <el-page-header title="返回" content="操作日志">
      <template #content>
        <span><strong>操作日志</strong></span>
      </template>
    </el-page-header>
    <el-text type="info">保留删除记录，并支持撤回误删</el-text>

    <el-divider />

    <el-row :gutter="16" align="middle">
      <el-col :span="6">
        <el-input
          v-model="codeKeyword"
          placeholder="搜索货号"
          clearable
          @input="onSearchInput"
          @clear="onSearchInput"
        />
      </el-col>
      <el-col :span="6">
        <el-input
          v-model="nameKeyword"
          placeholder="搜索鞋款"
          clearable
          @input="onSearchInput"
          @clear="onSearchInput"
        />
      </el-col>
      <el-col :span="4">
        <el-select
          v-model="typeFilter"
          placeholder="操作类型"
          clearable
          @change="onTypeChange"
        >
          <el-option
            v-for="opt in operationTypes"
            :key="opt.code"
            :label="opt.name"
            :value="opt.code"
          />
        </el-select>
      </el-col>
      <el-col :span="8" style="text-align: right">
        <el-button @click="refresh">刷新</el-button>
      </el-col>
    </el-row>

    <div :style="{ flex: 1, minHeight: 0, marginTop: '16px', display: 'flex', flexDirection: 'column' }">
      <el-table
        v-loading="loading"
        :data="list"
        :stripe="true"
        border
        height="100%"
        empty-text="暂无操作日志"
      >
      <el-table-column label="操作时间" width="140">
        <template #default="{ row }">
          <span>{{ operationTimeText(row as OperationLogVO) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作类型" width="120">
        <template #default="{ row }">
          <el-tag
            v-if="(row as OperationLogVO).operationType !== null && (row as OperationLogVO).operationType !== undefined"
            :type="typeTagType((row as OperationLogVO).operationType)"
            effect="plain"
            size="small"
          >
            {{ operationTypeMap.get((row as OperationLogVO).operationType) ?? '—' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="鞋款" min-width="220">
        <template #default="{ row }">
          <div><strong>{{ (row as OperationLogVO).productName ?? '—' }}</strong></div>
        </template>
      </el-table-column>
      <el-table-column label="货号 / 尺码" min-width="200">
        <template #default="{ row }">
          <span>
            {{ (row as OperationLogVO).productCode ?? '—' }}
            <template v-if="(row as OperationLogVO).productSize">
              · {{ (row as OperationLogVO).productSize }} 码
            </template>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="成本" width="140">
        <template #default="{ row }">
          <span v-if="(row as OperationLogVO).productPurchasePrice !== null && (row as OperationLogVO).productPurchasePrice !== undefined">
            {{ formatMoney((row as OperationLogVO).productPurchasePrice) }}
          </span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="售价" width="140">
        <template #default="{ row }">
          <span v-if="(row as OperationLogVO).productSalePrice !== null && (row as OperationLogVO).productSalePrice !== undefined">
            {{ formatMoney((row as OperationLogVO).productSalePrice) }}
          </span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="100">
        <template #default="{ row }">
          <span v-if="(row as OperationLogVO).productNumber !== null && (row as OperationLogVO).productNumber !== undefined">
            {{ (row as OperationLogVO).productNumber }} 双
          </span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="利润" width="120">
        <template #default="{ row }">
          <span v-if="profitOf(row as OperationLogVO) !== null">
            {{ formatMoney(profitOf(row as OperationLogVO)) }}
          </span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :disabled="!canUndo(row as OperationLogVO)"
            @click="confirmAndUndo(row as OperationLogVO)"
          >
            {{ undoLabel(row as OperationLogVO) || '—' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    </div>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next, jumper"
      background
      style="margin-top: 12px; justify-content: flex-end; display: flex"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />
  </div>
</template>