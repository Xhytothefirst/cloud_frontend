<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { login } from '../api/auth'
import { setToken } from '../utils/token'
import type { LoginRequest } from '../types/api'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive<LoginRequest>({
  username: '',
  password: '',
  rememberMe: false,
})

const rules: FormRules<LoginRequest> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不少于 6 位', trigger: 'blur' },
  ],
}

const onSubmit = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const token = await login(form)
      setToken(token)
      ElMessage.success('登录成功')
      router.replace('/')
    } catch (err) {
      ElMessage.error((err as Error).message)
    } finally {
      loading.value = false
    }
  })
}
</script>

<template>
  <el-container direction="vertical">
    <el-header>
      <el-text size="large" tag="strong">STOCK</el-text>
    </el-header>
    <el-main>
      <el-row justify="center">
        <el-col :span="6">
          <el-card>
            <template #header>登录</template>
            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-position="top"
              :style="{ '--el-component-size-large': '48px' }"
              @submit.prevent="onSubmit(formRef)"
            >
              <el-form-item label="用户名" prop="username">
                <el-input v-model="form.username" size="large" placeholder="请输入用户名" />
              </el-form-item>
              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="form.password"
                  type="password"
                  size="large"
                  show-password
                  placeholder="请输入密码"
                />
              </el-form-item>
              <el-form-item>
                <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  size="large"
                  native-type="submit"
                  :loading="loading"
                  :style="{ width: '100%' }"
                >登录</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>
