import { defineStore } from 'pinia'

export interface User {
  id: number
  fullName: string
  role: 'admin' | 'teacher'
}

export const useAuthStore = defineStore('auth', () => {
  // SSR va sahifa yangilanishida saqlanib qolishi uchun cookie'da
  const token = useCookie<string | null>('auth_token', {
    default: () => null,
    sameSite: 'lax'
  })
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => Boolean(token.value))

  function setSession(newToken: string, newUser: User | null = null) {
    token.value = newToken
    user.value = newUser
  }

  function logout() {
    token.value = null
    user.value = null
  }

  return { token, user, isLoggedIn, setSession, logout }
})
