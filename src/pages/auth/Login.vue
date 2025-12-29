<template>
  <div
    class="relative z-10 w-full space-y-6 p-6 rounded-xl shadow-2xl backdrop-blur-md border dark:bg-slate-800/50 dark:border-slate-700/50 bg-white border-slate-200"
  >
    <!-- Title -->
    <div class="flex justify-center">
      <h2 class="text-2xl font-bold dark:text-slate-100 text-slate-900">Stella</h2>
    </div>

    <!-- Login form -->
    <form class="space-y-4" @submit.prevent="submit">
      <div class="space-y-3 rounded-md">
        <!-- Email -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User class="h-5 w-5 text-slate-400" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            required
            v-model="formData.email"
            class="appearance-none block w-full pl-10 px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:z-10 sm:text-sm"
            placeholder="Email"
          />
        </div>

        <!-- Password -->
        <div class="relative">
          <!-- Left icon -->
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <KeyRound class="h-5 w-5 text-slate-400" />
          </div>

          <!-- Password input -->
          <input
            id="password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            required
            v-model="formData.password"
            class="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:z-10 sm:text-sm"
            placeholder="Password"
          />

          <!-- Toggle show/hide -->
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
            aria-label="Toggle password visibility"
          >
            <Eye v-if="!showPassword" class="h-5 w-5" />
            <EyeOff v-else class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="text-red-500 text-sm text-center">{{ error }}</div>

      <!-- Submit -->
      <div>
        <button
          type="submit"
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-700/60 hover:bg-purple-700/80 transition-colors duration-200"
        >
          Sign in
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vuestic-ui'
import { useUsersStore } from '@/stores/users'
import { useServiceStore } from '@/stores/services'
import axios from 'axios'
import { User, KeyRound, Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()
const { init } = useToast()
const userStore = useUsersStore()
const serviceStore = useServiceStore()
serviceStore.resetRest()

const formData = reactive({
  email: '',
  password: '',
})

const error = ref('')
const showPassword = ref(false)

async function submit() {
  error.value = ''
  if (!formData.email || !formData.password) {
    error.value = 'Email and password are required.'
    return
  }

  try {
    const url = import.meta.env.VITE_API_BASE_URL
    const res = await axios.post(`${url}/auth/signin`, formData)

    userStore.setUserDetails(res.data.user)
    init({ message: "You've successfully logged in", color: 'success' })

    window.sessionStorage.setItem('token', res.data.accessToken)
    window.sessionStorage.setItem('user', res.data.user.id)
    window.sessionStorage.setItem('role', res.data.user.role)

    if (res.data.user.role !== 'super-admin') {
      if (res.data.user.outlets?.length) {
        serviceStore.setRest(res.data.user.outlets[0])
        window.sessionStorage.setItem('selectedRest', res.data.user.outlets[0])
        const nextRoute = res.data.user.role.includes('caller') ? 'callCenters' : 'articles'
        router.push({ name: nextRoute })
      } else {
        init({ message: 'No outlet assigned', color: 'danger' })
      }
    } else {
      router.push({ name: 'list' })
    }
  } catch (err: any) {
    console.error(err)
    error.value = err?.response?.data?.message || 'Login failed'
    init({ message: error.value, color: 'danger' })
  }
}
</script>
