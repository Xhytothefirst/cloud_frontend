<script setup lang="ts">
import { reactive, ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  updatePassword,
  updateEmail,
  sendPasswordCaptcha,
  sendEmailCaptcha,
} from '../api/user'
import { clearToken } from '../utils/token'
import type { PasswordUpdateRequest, EmailUpdateRequest } from '../types/api'

const router = useRouter()

const visible = ref(false)
const mode = ref<'password' | 'email'>('password')
const formRef = ref<FormInstance>()
const loading = ref(false)
const countdown = ref(0)
let timer: number | undefined

const pwdForm = reactive<PasswordUpdateRequest>({ captcha: '', newPassword: '' })
const emailForm = reactive<EmailUpdateRequest>({ captcha: '', newEmail: '' })

const title = computed(() => (mode.value === 'password' ? '修改密码' : '修改邮箱'))

const rules = computed<FormRules>(() =>
  mode.value === 'password'
    ? {
        captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度不少于 6 位', trigger: 'blur' },
        ],
      }
    : {
        captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
        newEmail: [
          { required: true, message: '请输入新邮箱', trigger: 'blur' },
          { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
        ],
      },
)

const open = (m: 'password' | 'email') => {
  mode.value = m
  pwdForm.captcha = ''
  pwdForm.newPassword = ''
  emailForm.captcha = ''
  emailForm.newEmail = ''
  countdown.value = 0
  visible.value = true
}

const sendCaptcha = async () => {
  try {
    if (mode.value === 'password') await sendPasswordCaptcha()
    else await sendEmailCaptcha()
    ElMessage.success('验证码已发送至当前邮箱')
    if (!timer) {
      timer = window.setInterval(() => {
        if (countdown.value > 0) countdown.value--
        else if (timer) {
          clearInterval(timer)
          timer = undefined
        }
      }, 1000)
    }
    countdown.value = 60
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

const onSubmit = async (el?: FormInstance) => {
  if (!el) return
  await el.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      if (mode.value === 'password') {
        await updatePassword(pwdForm)
        visible.value = false
        clearToken()
        ElMessage.success('密码修改成功，请重新登录')
        router.replace('/login')
      } else {
        await updateEmail(emailForm)
        ElMessage.success('邮箱修改成功')
        visible.value = false
      }
    } catch (e) {
      ElMessage.error((e as Error).message)
    } finally {
      loading.value = false
    }
  })
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div :style="{ height: '100%' }">
    <el-page-header title="返回" content="系统设置">
      <template #content>
        <span><strong>系统设置</strong></span>
      </template>
    </el-page-header>
    <el-text type="info">管理提醒与账户</el-text>

    <el-divider />

    <el-card style="margin-bottom: 16px">
      <template #header>提醒设置</template>
    </el-card>

    <el-card>
      <template #header>账户设置</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="登录密码">
          <el-button type="primary" link @click="open('password')">更改</el-button>
        </el-descriptions-item>
        <el-descriptions-item label="安全邮箱">
          <el-button type="primary" link @click="open('email')">更改</el-button>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-dialog
      v-model="visible"
      :title="title"
      width="420px"
      destroy-on-close
      @opened="formRef?.clearValidate()"
    >
      <el-form
        ref="formRef"
        :model="mode === 'password' ? pwdForm : emailForm"
        :rules="rules"
        label-position="top"
        @submit.prevent="onSubmit(formRef)"
      >
        <el-form-item v-if="mode === 'email'" label="新邮箱" prop="newEmail">
          <el-input v-model="emailForm.newEmail" placeholder="请输入新邮箱" />
        </el-form-item>
        <el-form-item v-if="mode === 'password'" label="新密码" prop="newPassword">
          <el-input
            v-model="pwdForm.newPassword"
            type="password"
            show-password
            placeholder="不少于 6 位"
          />
        </el-form-item>
        <el-form-item label="验证码" prop="captcha">
          <el-input
            v-model="(mode === 'password' ? pwdForm : emailForm).captcha"
            placeholder="当前邮箱收到的验证码"
          >
            <template #append>
              <el-button :disabled="countdown > 0" @click="sendCaptcha">
                {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="onSubmit(formRef)">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
