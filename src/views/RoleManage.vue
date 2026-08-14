<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  batchDeleteRoles,
  deleteRole,
  getRole,
  saveRole,
  searchRoles,
  updateRole,
  type RoleSearchParams,
} from '../api/role'
import { listAllPermissions } from '../api/permission'
import type { PermissionVO, RoleRequest, RoleVO } from '../types/api'

const loading = ref(false)
const list = ref<RoleVO[]>([])
const selectedRows = ref<RoleVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const searchKeyword = ref<string>('')
const searchTimer = ref<number | null>(null)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance | null>(null)
const form = reactive<RoleRequest>({
  name: '',
  description: '',
  permissionIds: [],
})

// 全部可选权限（来自后端，供角色编辑时勾选）
const permissionOptions = ref<PermissionVO[]>([])

const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.permissionIds = []
  editingId.value = null
  formRef.value?.clearValidate()
}

const buildQuery = (): RoleSearchParams => {
  const q: RoleSearchParams = {
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
    const data = await searchRoles(buildQuery())
    list.value = data.records
    total.value = data.total
  } catch (err) {
    ElMessage.error((err as Error).message)
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    permissionOptions.value = await listAllPermissions()
  } catch (err) {
    ElMessage.error((err as Error).message)
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

const openEditDialog = async (row: RoleVO) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  try {
    const detail = await getRole(row.id as number)
    form.name = detail.name ?? ''
    form.description = detail.description ?? ''
    form.permissionIds = (detail.permissions ?? []).map((p) => p.id)
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
      await saveRole({ ...form, permissionIds: [...form.permissionIds] })
      ElMessage.success('新增成功')
    } else if (editingId.value !== null) {
      await updateRole(editingId.value, { ...form, permissionIds: [...form.permissionIds] })
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
    await deleteRole(id)
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
      '此操作将删除该角色。注意：若该角色下仍关联账号，无法删除。',
      '确认删除该角色？',
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

const onSelectionChange = (rows: RoleVO[]) => {
  selectedRows.value = rows
}

const handleBatchDelete = async () => {
  const ids = selectedRows.value
    .map((r) => r.id)
    .filter((id): id is number => typeof id === 'number')
  if (ids.length === 0) return
  try {
    await ElMessageBox.confirm(
      `即将删除已选的 ${ids.length} 个角色。角色下存在账号时无法删除。`,
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
    await batchDeleteRoles(ids)
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
  void fetchPermissions()
})
</script>

<template>
  <div :style="{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }">
    <el-page-header title="返回" content="角色管理">
      <template #content>
        <span><strong>角色管理</strong></span>
      </template>
    </el-page-header>
    <el-text type="info">维护角色及其权限，角色下存在账号时无法删除</el-text>

    <el-divider />

    <el-row :gutter="16" align="middle" justify="space-between">
      <el-col :span="16">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索角色名称"
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
        + 新增角色
      </el-button>
    </div>

    <div :style="{ flex: 1, minHeight: 0, marginTop: '16px', display: 'flex', flexDirection: 'column' }">
      <el-table
        v-loading="loading"
        :data="list"
        :stripe="true"
        border
        height="100%"
        empty-text="暂无角色"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="角色名称" min-width="160" />
        <el-table-column prop="description" label="角色描述" min-width="200">
          <template #default="{ row }">
            <span>{{ (row as RoleVO).description || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="userCount" label="用户数量" width="100">
          <template #default="{ row }">
            <span>{{ (row as RoleVO).userCount ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建日期" width="160">
          <template #default="{ row }">
            <span>{{ (row as RoleVO).createTime ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row as RoleVO)">编辑</el-button>
            <el-button link type="danger" @click="confirmAndDelete((row as RoleVO).id as number)">删除</el-button>
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
      :title="dialogMode === 'create' ? '新增角色' : '编辑角色'"
      width="520px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="如 库管员" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="角色描述" prop="description">
          <el-input
            v-model="form.description"
            placeholder="可选"
            maxlength="255"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="权限" prop="permissionIds">
          <el-checkbox-group v-model="form.permissionIds">
            <el-checkbox
              v-for="perm in permissionOptions"
              :key="perm.id"
              :label="perm.name"
              :value="perm.id"
            >
              {{ perm.name }}
            </el-checkbox>
          </el-checkbox-group>
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
