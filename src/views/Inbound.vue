<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useRoute } from 'vue-router'
import {
  batchDeleteProducts,
  deleteProduct,
  getProduct,
  saleProduct,
  saveProduct,
  searchProducts,
  updateProduct,
  type ProductSearchParams,
} from '../api/product'
import { getPlatforms, getStatuses } from '../api/enum'
import { listAllBrands } from '../api/brand'
import type { BrandVO, EnumOption, ProductRequest, ProductVO } from '../types/api'

const route = useRoute()

const platformOptions = ref<EnumOption[]>([])
const statusOptions = ref<EnumOption[]>([])
const brandOptions = ref<BrandVO[]>([])

const platformMap = computed(() => {
  const m = new Map<number, string>()
  platformOptions.value.forEach((p) => m.set(p.code, p.name))
  return m
})

const statusTagType = (code: number): 'success' | 'warning' | 'info' => {
  if (code === 1) return 'success'
  if (code === 2) return 'warning'
  return 'info'
}

const loading = ref(false)
const list = ref<ProductVO[]>([])
const selectedRows = ref<ProductVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const codeFilter = ref<string>('')
const nameFilter = ref<string>('')
const sizeFilter = ref<string>('')
const statusFilter = ref<number | null>(1)
const brandFilter = ref<number | null>(null)
const costMin = ref<number | null | undefined>(undefined)
const costMax = ref<number | null | undefined>(undefined)
const dateRange = ref<[string, string] | []>([])
const searchTimer = ref<number | null>(null)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance | null>(null)
const form = reactive<ProductRequest>({
  code: '',
  name: '',
  purchasePrice: 0,
  number: 1,
  size: '',
  platform: 1,
  brandId: null,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入货号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入鞋款名称', trigger: 'blur' }],
  size: [{ required: true, message: '请输入尺码', trigger: 'blur' }],
  number: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  purchasePrice: [{ required: true, message: '请输入成本', trigger: 'blur' }],
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  brandId: [{ required: true, message: '请选择品牌', trigger: 'change' }],
}

const resetForm = () => {
  form.code = ''
  form.name = ''
  form.purchasePrice = 0
  form.number = 1
  form.size = ''
  form.platform = platformOptions.value[0]?.code ?? 1
  form.brandId = null
  editingId.value = null
  formRef.value?.clearValidate()
}

const fetchLookups = async () => {
  const [platforms, statuses, brands] = await Promise.all([
    getPlatforms(),
    getStatuses(),
    listAllBrands(),
  ])
  platformOptions.value = platforms
  statusOptions.value = statuses
  brandOptions.value = brands
  if (!form.platform && platforms.length > 0) {
    form.platform = platforms[0].code
  }
}

const buildQuery = (): ProductSearchParams => {
  const q: ProductSearchParams = {
    page: page.value,
    pageSize: pageSize.value,
  }
  const code = codeFilter.value.trim()
  if (code) {
    q.code = code
  }
  const name = nameFilter.value.trim()
  if (name) {
    q.name = name
  }
  const size = sizeFilter.value.trim()
  if (size) {
    q.size = size
  }
  if (statusFilter.value !== null && statusFilter.value !== undefined) {
    q.status = statusFilter.value
  }
  if (brandFilter.value !== null && brandFilter.value !== undefined) {
    q.brandId = brandFilter.value
  }
  if (costMin.value !== undefined && costMin.value !== null) {
    q.minPurchasePrice = costMin.value
  }
  if (costMax.value !== undefined && costMax.value !== null) {
    q.maxPurchasePrice = costMax.value
  }
  if (dateRange.value && dateRange.value.length === 2) {
    q.startTime = dateRange.value[0]
    q.endTime = dateRange.value[1]
  }
  return q
}

const fetchList = async () => {
  loading.value = true
  try {
    const data = await searchProducts(buildQuery())
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

const onStatusChange = () => {
  page.value = 1
  void fetchList()
}

const onBrandChange = () => {
  page.value = 1
  void fetchList()
}

const onCostChange = () => {
  if (
    typeof costMin.value === 'number' &&
    typeof costMax.value === 'number' &&
    costMin.value > costMax.value
  ) {
    ElMessage.warning('成本下限不能大于上限')
    return
  }
  page.value = 1
  void fetchList()
}

const onDateChange = () => {
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

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = async (row: ProductVO) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  try {
    const detail = await getProduct(row.id)
    if (brandOptions.value.length === 0) {
      await fetchLookups()
    }
    form.code = detail.code
    form.name = detail.name
    form.size = detail.size ?? ''
    form.number = detail.number ?? 1
    form.purchasePrice = Number(detail.purchasePrice ?? 0)
    form.platform = detail.platform ?? 1
    form.brandId = detail.brandId ?? null
    dialogVisible.value = true
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    if (dialogMode.value === 'create') {
      await saveProduct({ ...form })
      ElMessage.success('入库成功')
    } else if (editingId.value !== null) {
      await updateProduct(editingId.value, { ...form })
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const saleDialogVisible = ref(false)
const saleRowId = ref<number | null>(null)
const salePrice = ref<number>(0)
const salePurchasePrice = ref<number>(0)
const saleNumber = ref<number>(1)
const saleProfit = computed(() =>
  (salePrice.value - salePurchasePrice.value) * saleNumber.value,
)

const openSaleDialog = (row: ProductVO) => {
  saleRowId.value = row.id
  salePrice.value = Number(row.salePrice ?? 0)
  salePurchasePrice.value = Number(row.purchasePrice ?? 0)
  saleNumber.value = Number(row.number ?? 1)
  saleDialogVisible.value = true
}

const submitSale = async () => {
  if (saleRowId.value === null) return
  if (!salePrice.value || salePrice.value <= 0) {
    ElMessage.warning('请填写有效的售价')
    return
  }
  try {
    await saleProduct(saleRowId.value, salePrice.value)
    ElMessage.success('已标记为已售')
    saleDialogVisible.value = false
    await fetchList()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const handleDelete = async (id: number) => {
  try {
    await deleteProduct(id)
    ElMessage.success('删除成功')
    if (list.value.length === 1 && page.value > 1) {
      page.value -= 1
    }
    await fetchList()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const confirmAndDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      '此操作将删除该入库记录及其成本信息。删除后可通过操作日志撤回。',
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  await handleDelete(id)
}

const onSelectionChange = (rows: ProductVO[]) => {
  selectedRows.value = rows
}

const handleBatchDelete = async () => {
  const ids = selectedRows.value
    .map((r) => r.id)
    .filter((id): id is number => typeof id === 'number')
  if (ids.length === 0) return
  try {
    await ElMessageBox.confirm(
      `即将删除已选的 ${ids.length} 条入库记录。删除后可通过操作日志撤回`,
      '批量删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  try {
    await batchDeleteProducts(ids)
    ElMessage.success(`已删除 ${ids.length} 项`)
    selectedRows.value = []
    if (list.value.length <= ids.length && page.value > 1) {
      page.value -= 1
    }
    await fetchList()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const formatMoney = (n: number | null | undefined) =>
  `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const statusName = (code: number | undefined) => {
  if (code === undefined || code === null) return '未知'
  const found = statusOptions.value.find((s) => s.code === code)
  return found ? found.name : '未知'
}

const isNormalStatus = (row: ProductVO) => row.status === 1

const isDeletedStatus = (row: ProductVO) => row.status === 3

onMounted(async () => {
  await fetchLookups()
  await fetchList()
  if (route.query.refresh) {
    page.value = 1
    await fetchList()
  }
})
</script>

<template>
  <div :style="{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }">
    <el-page-header title="返回" content="入库记录">
      <template #content>
        <span><strong>入库记录</strong></span>
      </template>
    </el-page-header>
    <el-text type="info">记录每次采购的球鞋和成本</el-text>

    <el-divider />

    <el-row :gutter="12">
      <el-col :span="5">
        <el-input
          v-model="codeFilter"
          placeholder="货号"
          clearable
          @input="onSearchInput"
          @clear="onSearchInput"
        />
      </el-col>
      <el-col :span="5">
        <el-input
          v-model="nameFilter"
          placeholder="鞋名"
          clearable
          @input="onSearchInput"
          @clear="onSearchInput"
        />
      </el-col>
      <el-col :span="4">
        <el-input
          v-model="sizeFilter"
          placeholder="尺码"
          clearable
          @input="onSearchInput"
          @clear="onSearchInput"
        />
      </el-col>
      <el-col :span="5">
        <el-select
          v-model="statusFilter"
          placeholder="状态"
          clearable
          @change="onStatusChange"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.code"
            :label="opt.name"
            :value="opt.code"
          />
        </el-select>
      </el-col>
      <el-col :span="5">
        <el-select
          v-model="brandFilter"
          placeholder="品牌"
          clearable
          filterable
          @change="onBrandChange"
        >
          <el-option
            v-for="b in brandOptions"
            :key="b.id ?? ''"
            :label="b.name ?? ''"
            :value="b.id ?? 0"
          />
        </el-select>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :span="8">
        <el-input-number
          v-model="costMin"
          :min="0"
          :value-on-clear="null"
          :precision="2"
          :step="10"
          placeholder="最低成本"
          controls-position="right"
          style="width: 45%"
          @change="onCostChange"
        />
        <span style="display: inline-block; width: 10%; text-align: center">—</span>
        <el-input-number
          v-model="costMax"
          :min="0"
          :value-on-clear="null"
          :precision="2"
          :step="10"
          placeholder="最高成本"
          controls-position="right"
          style="width: 45%"
          @change="onCostChange"
        />
      </el-col>
      <el-col :span="8">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 100%"
          @change="onDateChange"
        />
      </el-col>
    </el-row>

    <div class="batch-toolbar">
      <el-button
        v-if="selectedRows.length > 0"
        type="danger"
        @click="handleBatchDelete"
      >
        批量删除 (已选 {{ selectedRows.length }})
      </el-button>
      <el-button
        v-if="selectedRows.length > 0"
        link
        @click="selectedRows = []"
      >
        取消选择
      </el-button>
      <el-button type="primary" style="margin-left: auto" @click="openCreateDialog">
        + 新增入库
      </el-button>
    </div>

    <div :style="{ flex: 1, minHeight: 0, marginTop: '16px', display: 'flex', flexDirection: 'column' }">
      <el-table
        v-loading="loading"
        :data="list"
        :stripe="true"
        border
        height="100%"
        empty-text="暂无入库记录"
        @selection-change="onSelectionChange"
      >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="code" label="货号" min-width="140" />
      <el-table-column label="鞋款" min-width="200">
        <template #default="{ row }">
          <div>{{ row.name }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="尺码" width="80" />
      <el-table-column label="数量" width="80">
        <template #default="{ row }">
          <span>{{ row.number ?? 0 }} 双</span>
        </template>
      </el-table-column>
      <el-table-column label="成本" width="120">
        <template #default="{ row }">
          <span>{{ formatMoney(row.purchasePrice) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="参考售价" width="220">
        <template #default="{ row }">
          <template v-if="(row as ProductVO).salePrice !== null && (row as ProductVO).salePrice !== undefined">
            <div>{{ formatMoney((row as ProductVO).salePrice) }}</div>
            <el-text type="success" size="small">
              利润 {{ formatMoney((row as ProductVO).profit) }}
            </el-text>
          </template>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="平台" width="120">
        <template #default="{ row }">
          <span v-if="(row as ProductVO).platform && platformMap.get((row as ProductVO).platform!)">
            {{ platformMap.get((row as ProductVO).platform!) }}
          </span>
          <span v-else>待分配</span>
        </template>
      </el-table-column>
      <el-table-column label="品牌" width="140">
        <template #default="{ row }">
          <span>{{ (row as ProductVO).brandName ?? '未分配' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag
            v-if="(row as ProductVO).status !== null && (row as ProductVO).status !== undefined"
            :type="statusTagType((row as ProductVO).status!)"
            effect="plain"
            size="small"
          >
            {{ statusName((row as ProductVO).status!) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="入库日期" width="120">
        <template #default="{ row }">
          <span>{{ (row as ProductVO).createTime ?? '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="!isDeletedStatus(row as ProductVO)"
            link
            type="primary"
            @click="openEditDialog(row as ProductVO)"
          >
            编辑
          </el-button>
          <el-button
            v-if="isNormalStatus(row as ProductVO)"
            link
            type="primary"
            @click="openSaleDialog(row as ProductVO)"
          >
            已售
          </el-button>
          <el-button
            v-if="!isDeletedStatus(row as ProductVO)"
            link
            type="danger"
            @click="confirmAndDelete((row as ProductVO).id)"
          >
            删除
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增入库' : '编辑入库'"
      width="560px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="货号" prop="code">
          <el-input v-model="form.code" placeholder="如 DD1391-100" />
        </el-form-item>
        <el-form-item label="鞋款名称" prop="name">
          <el-input v-model="form.name" placeholder="如 Air Jordan 1 Low 白灰" />
        </el-form-item>
        <el-form-item label="尺码" prop="size">
          <el-input v-model="form.size" placeholder="如 42" />
        </el-form-item>
        <el-form-item label="品牌" prop="brandId">
          <el-select
            :key="`brand-select-${brandOptions.length}`"
            v-model="form.brandId"
            placeholder="请选择品牌"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="b in brandOptions"
              :key="b.id ?? ''"
              :label="b.name ?? ''"
              :value="b.id ?? 0"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="number">
          <el-input-number v-model="form.number" :min="1" :step="1" />
        </el-form-item>
        <el-form-item label="成本" prop="purchasePrice">
          <el-input-number
            v-model="form.purchasePrice"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="平台" prop="platform">
          <el-select v-model="form.platform" placeholder="请选择平台" style="width: 100%">
            <el-option
              v-for="opt in platformOptions"
              :key="opt.code"
              :label="opt.name"
              :value="opt.code"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="saleDialogVisible" title="标记已售" width="400px">
      <el-form label-width="80px">
        <el-form-item label="售价">
          <el-input-number
            v-model="salePrice"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="利润">
          <el-text :type="saleProfit >= 0 ? 'success' : 'danger'">
            {{ formatMoney(saleProfit) }}
          </el-text>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSale">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.batch-toolbar {
  margin-top: 16px;
  min-height: 48px;
  display: flex;
  align-items: center;
}
</style>