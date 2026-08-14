import http from './http'
import type { EmailUpdateRequest, PasswordUpdateRequest } from '../types/api'

export const sendPasswordCaptcha = (): Promise<void> =>
  http.get<void, void>('/user/password/send-captcha')

export const sendEmailCaptcha = (): Promise<void> =>
  http.get<void, void>('/user/email/send-captcha')

export const updatePassword = (req: PasswordUpdateRequest): Promise<void> =>
  http.post<void, void>('/user/update-password', req)

export const updateEmail = (req: EmailUpdateRequest): Promise<void> =>
  http.post<void, void>('/user/update-email', req)
