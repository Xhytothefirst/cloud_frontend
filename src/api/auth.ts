import http from './http'
import type { LoginRequest } from '../types/api'

export const login = (req: LoginRequest): Promise<string> =>
  http.post<string, string>('/auth/login', req)

export const logout = (): Promise<void> => http.post<void, void>('/auth/logout')
