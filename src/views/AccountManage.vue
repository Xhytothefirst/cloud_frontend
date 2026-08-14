<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  deleteAccount,
  getAccount,
  saveAccount,
  searchAccounts,
  updateAccount,
  type AccountSearchParams,
} from '../api/account'
import { listAllRoles } from '../api/role'
import type { AccountRequest, AccountVO, RoleVO } from '../types/api'

const loading = ref(false)
const list = ref<AccountVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 搜索条件
const searchUsername = ref('')
const searchFullName = ref('')
const searchRoleId = ref<number | undefined>(undefined)
const searchEnabled = ref<boolean | undefined>(undefined)

// 角色下拉选项（搜索 & 表单共用）
const roleOptions = ref<RoleVO[]>([])

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance | null>(null)
const form = reactive<AccountRequest>({
  username: '',
  fullName: '',
  password: '',
  email: '',
  enabled: true,
  roleIds: [],
})

const rules = reactive<FormRules>({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  fullName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
})

const resetForm = () => {
  form.username = ''
  form.fullName = ''
  form.password = ''
  form.email = ''
  form.enabled = true
  form.roleIds = []
  editingId.value = null
  formRef.value?.clearValidate()
}

const buildQuery = (): AccountSearchParams => {
  const q: AccountSearchParams = {
    page: page.value,
    pageSize: pageSize.value,
  }
  const u = searchUsername.value.trim()
  if (u) q.username = u
  const f = searchFullName.value.trim()
  if (f) q.fullName = f
  if (searchRoleId.value !== undefined) q.roleId = searchRoleId.value
  if (searchEnabled.value !== undefined) q.enabled = searchEnabled.value
  return q
}

const fetchList = async () => {
  loading.value = true
  try {
    const data = await searchAccounts(buildQuery())
    list.value = data.records
    total.value = data.total
  } catch (err) {
    ElMessage.error((err as Error).message)
  } finally {
    loading.value = false
  }
}

const fetchRoles = async () => {
  try {
    roleOptions.value = await listAllRoles()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const onSearch = () => {
  page.value = 1
  void fetchList()
}

const onReset = () => {
  searchUsername.value = ''
  searchFullName.value = ''
  searchRoleId.value = undefined
  searchEnabled.value = undefined
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

const openEditDialog = async (row: AccountVO) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  try {
    const detail = await getAccount(row.id as number)
    form.username = detail.username ?? ''
    form.fullName = detail.fullName ?? ''
    form.password = '' // 编辑时留空表示不修改
    form.email = detail.email ?? ''
    form.enabled = detail.enabled ?? true
    form.roleIds = (detail.roles ?? []).map((r) => r.id).filter((id): id is number => id !== null)
    dialogVisible.value = true
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (dialogMode.value === 'create' && !form.password) {
    ElMessage.warning('请输入密码')
    return
  }
  try {
    const payload: AccountRequest = {
      username: form.username,
      fullName: form.fullName,
      password: form.password || null,
      email: form.email || null,
      enabled: form.enabled,
      roleIds: [...form.roleIds],
    }
    if (dialogMode.value === 'create') {
      await saveAccount(payload)
      ElMessage.success('新增成功')
    } else if (editingId.value !== null) {
      await updateAccount(editingId.value, payload)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

const confirmAndDelete = async (row: AccountVO) => {
  try {
    await ElMessageBox.confirm(`确认删除账号「${row.username}」？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteAccount(row.id as number)
    ElMessage.success('删除成功')
    if (list.value.length === 1 && page.value > 1) {
      page.value -= 1
    }
    await fetchList()
  } catch (err) {
    ElMessage.error((err as Error).message)
  }
}

onMounted(() => {
  void fetchRoles()
  void fetchList()
})
</script>

<template>
  <div :style="{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }">
    <el-page-header title="返回" content="账号管理">
      <template #content>
        <span><strong>账号管理</strong></span>
      </template>
    </el-page-header>
    <el-text type="info">维护登录账号及其角色</el-text>

    <el-divider />

    <el-row :gutter="16" align="middle">
      <el-col :span="5">
        <el-input v-model="searchUsername" placeholder="用户名" clearable @keyup.enter="onSearch" />
      </el-col>
      <el-col :span="5">
        <el-input v-model="searchFullName" placeholder="姓名" clearable @keyup.enter="onSearch" />
      </el-col>
      <el-col :span="5">
        <el-select v-model="searchRoleId" placeholder="角色" clearable style="width: 100%">
          <el-option
            v-for="role in roleOptions"
            :key="(role.id as number)"
            :label="(role.name as string)"
            :value="(role.id as number)"
          />
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-select v-model="searchEnabled" placeholder="状态" clearable style="width: 100%">
          <el-option :label="'启用'" :value="true" />
          <el-option :label="'停用'" :value="false" />
        </el-select>
      </el-col>
      <el-col :span="5" :style="{ display: 'flex', gap: '8px' }">
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-col>
    </el-row>

    <div class="batch-toolbar">
      <el-button type="primary" style="margin-left: auto" @click="openCreateDialog">
        + 新增账号
      </el-button>
    </div>

    <div :style="{ flex: 1, minHeight: 0, marginTop: '16px', display: 'flex', flexDirection: 'column' }">
      <el-table
        v-loading="loading"
        :data="list"
        :stripe="true"
        border
        height="100%"
        empty-text="暂无账号"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="fullName" label="姓名" min-width="120" />
        <el-table-column label="角色" min-width="180">
          <template #default="{ row }">
            <template v-if="((row as AccountVO).roles ?? []).length > 0">
              <el-tag
                v-for="role in (row as AccountVO).roles"
                :key="(role.id as number)"
                type="info"
                style="margin-right: 4px"
              >
                {{ role.name }}
              </el-tag>
            </template>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180">
          <template #default="{ row }">
            <span>{{ (row as AccountVO).email || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="(row as AccountVO).enabled ? 'success' : 'danger'">
              {{ (row as AccountVO).enabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            <span>{{ (row as AccountVO).createTime ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row as AccountVO)">编辑</el-button>
            <el-button link type="danger" @click="confirmAndDelete(row as AccountVO)">删除</el-button>
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
      :title="dialogMode === 'create' ? '新增账号' : '编辑账号'"
      width="520px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="登录用户名" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="姓名" prop="fullName">
          <el-input v-model="form.fullName" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="dialogMode === 'edit' ? '留空表示不修改密码' : '请输入密码'"
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="可选" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="角色" prop="roleIds">
          <el-select
            v-model="form.roleIds"
            multiple
            placeholder="可多选"
            style="width: 100%"
          >
            <el-option
              v-for="role in roleOptions"
              :key="(role.id as number)"
              :label="(role.name as string)"
              :value="(role.id as number)"
            />
          </el-select>
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
