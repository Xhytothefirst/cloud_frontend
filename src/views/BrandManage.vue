<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  batchDeleteBrands,
  deleteBrand,
  getBrand,
  saveBrand,
  searchBrands,
  updateBrand,
  type BrandSearchParams,
} from '../api/brand'
import type { BrandRequest, BrandVO } from '../types/api'

const loading = ref(false)
const list = ref<BrandVO[]>([])
const selectedRows = ref<BrandVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const searchKeyword = ref<string>('')
const searchTimer = ref<number | null>(null)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance | null>(null)
const form = reactive<BrandRequest>({
  name: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入品牌名称', trigger: 'blur' }],
}

const resetForm = () => {
  form.name = ''
  editingId.value = null
  formRef.value?.clearValidate()
}

const buildQuery = (): BrandSearchParams => {
  const q: BrandSearchParams = {
    page: page.value,
    pageSize: pageSize.value,
  }
  const kw = searchKeyword.value.trim()
  if (kw) {
    q.name = kw
  }
  return q
}

const fetchList = async () => {
  loading.value = true
  try {
    const data = await searchBrands(buildQuery())
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

const openEditDialog = async (row: BrandVO) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  try {
    const detail = await getBrand(row.id as number)
    form.name = detail.name ?? ''
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
      await saveBrand({ ...form })
      ElMessage.success('新增成功')
    } else if (editingId.value !== null) {
      await updateBrand(editingId.value, { ...form })
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const handleDelete = async (id: number) => {
  try {
    await deleteBrand(id)
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
      '此操作将删除该品牌。注意：若该品牌下仍关联商品，无法删除。',
      '确认删除该品牌？',
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

const onSelectionChange = (rows: BrandVO[]) => {
  selectedRows.value = rows
}

const handleBatchDelete = async () => {
  const ids = selectedRows.value
    .map((r) => r.id)
    .filter((id): id is number => typeof id === 'number')
  if (ids.length === 0) return
  try {
    await ElMessageBox.confirm(
      `即将删除已选的 ${ids.length} 个品牌。品牌下存在商品时无法删除。删除后可通过操作日志撤回`,
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
    await batchDeleteBrands(ids)
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

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <div :style="{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }">
    <el-page-header title="返回" content="品牌管理">
      <template #content>
        <span><strong>品牌管理</strong></span>
      </template>
    </el-page-header>
    <el-text type="info">维护球鞋品牌信息，品牌下存在商品时无法删除</el-text>

    <el-divider />

    <el-row :gutter="16" align="middle" justify="space-between">
      <el-col :span="16">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索品牌名称"
          clearable
          @input="onSearchInput"
          @clear="onSearchInput"
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
        + 新增品牌
      </el-button>
    </div>

    <div :style="{ flex: 1, minHeight: 0, marginTop: '16px', display: 'flex', flexDirection: 'column' }">
      <el-table
        v-loading="loading"
        :data="list"
        :stripe="true"
        border
        height="100%"
        empty-text="暂无品牌"
        @selection-change="onSelectionChange"
      >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="品牌名称" min-width="200" />
      <el-table-column label="创建日期" width="140">
        <template #default="{ row }">
          <span>{{ (row as BrandVO).createTime ?? '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新日期" width="140">
        <template #default="{ row }">
          <span>{{ (row as BrandVO).updateTime ?? '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditDialog(row as BrandVO)">编辑</el-button>
          <el-button link type="danger" @click="confirmAndDelete((row as BrandVO).id as number)">删除</el-button>
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
      :title="dialogMode === 'create' ? '新增品牌' : '编辑品牌'"
      width="480px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="品牌名称" prop="name">
          <el-input v-model="form.name" placeholder="如 Nike" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">提交</el-button>
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