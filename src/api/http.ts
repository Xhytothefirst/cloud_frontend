import axios from 'axios'
import type { Result } from '../types/api'
import { getToken } from '../utils/token'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data as Result<unknown> | undefined
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 200) {
        return Promise.reject(new Error(body.msg || '请求失败'))
      }
      return body.data
    }
    return response.data
  },
  (error) => {
    const message = error?.response?.data?.msg || error?.message || '网络异常'
    return Promise.reject(new Error(message))
  },
)

export default http