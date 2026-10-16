<script setup lang="ts">
// Prepaid codes (ContentCard / Brodos gift cards and game codes) for the
// navbar outlet — admins. GET /contentcard/settings/:outletId gives the
// outlet's settings (outlet.contentCardSettings, server-managed), their
// problems and warnings, the saved ContentCard access (masked: never the
// password), the outlet's live zones and how many articles are prepaid codes.
// Save PUTs the whole settings object (strict body); the server refuses a
// switched-on save while a sale could not work. The access (host, user,
// password, cspid, serviceid …) is write-only: PUT /contentcard/credentials
// saves it sealed, POST …/test asks ContentCard with a harmless call, DELETE
// removes it. Without a saved access the server's CONTENTCARD_* env is used.
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useToast, useModal } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import { eshopApiError, formatDateTime } from './eshopHelpers'

const CAPS = [
  'maxUnitsPerOrder',
  'maxOrderValue',
  'dailyCapPerCustomer',
  'dailyValueCapPerCustomer',
  'maxOpenReservationsPerOutlet',
] as const
type CapKey = (typeof CAPS)[number]

type Settings = {
  enabled: boolean
  customerNo: string
  terminalId: string
  apiVersion: string
  maxUnitsPerOrder: number
  maxOrderValue: number
  dailyCapPerCustomer: number
  dailyValueCapPerCustomer: number
  maxOpenReservationsPerOutlet: number
  voucherOnlySkipsWinmax: boolean
  excludeFromLoyalty: boolean
  alertEmails: string[]
  alertPhones: string[]
  voucherZoneId: string
}
/** The settings as typed: caps as the fields hold them, recipients as comma lists. */
type Form = Omit<Settings, CapKey | 'alertEmails' | 'alertPhones'> & {
  maxUnitsPerOrder: string | number
  maxOrderValue: string | number
  dailyCapPerCustomer: string | number
  dailyValueCapPerCustomer: string | number
  maxOpenReservationsPerOutlet: string | number
  alertEmails: string
  alertPhones: string
}
type Access = {
  hosts: string[]
  path: string
  authMode: 'basic' | 'query'
  userMasked: string
  passwordLast2: string
  cspidMasked: string
  serviceIdMasked: string
  customerNoMasked: string
  terminalIdMasked: string
  version: string
  missing: string[]
  savedBy: string
  savedAt: string
  lastTestAt: string
  lastTestOk: boolean | null
  lastTestMessage: string
}
type Credentials = { pinKeyState: string; envFallback: boolean; saved: Access | null }
type Zone = { zoneId: string; name: string }
type Note = { ok: boolean; text: string }

const { t } = useI18n()
const { init } = useToast()
const { confirm } = useModal()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop } = useEshopOutlet()

/* ---------------- Reading answers ---------------- */
const text = (v: unknown): string => (v === undefined || v === null ? '' : String(v))
const strings = (v: unknown): string[] => {
  if (!Array.isArray(v)) return []
  return v
    .map(text)
    .map((s) => s.trim())
    .filter(Boolean)
}
const whole = (v: unknown): number => {
  const s = text(v).trim()
  return /^\d+$/.test(s) ? Number(s) : NaN
}
const list = (v: string): string[] =>
  v
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean)

function settingsOf(s: any): Settings {
  const src = s && typeof s === 'object' ? s : {}
  const cap = (v: unknown, dflt: number) => {
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 ? n : dflt
  }
  return {
    enabled: src.enabled === true,
    customerNo: text(src.customerNo).trim(),
    terminalId: text(src.terminalId).trim(),
    apiVersion: text(src.apiVersion).trim(),
    maxUnitsPerOrder: cap(src.maxUnitsPerOrder, 5),
    maxOrderValue: cap(src.maxOrderValue, 100),
    dailyCapPerCustomer: cap(src.dailyCapPerCustomer, 10),
    dailyValueCapPerCustomer: cap(src.dailyValueCapPerCustomer, 200),
    maxOpenReservationsPerOutlet: cap(src.maxOpenReservationsPerOutlet, 50),
    voucherOnlySkipsWinmax: src.voucherOnlySkipsWinmax === true,
    excludeFromLoyalty: src.excludeFromLoyalty !== false,
    alertEmails: strings(src.alertEmails),
    alertPhones: strings(src.alertPhones),
    voucherZoneId: text(src.voucherZoneId).trim(),
  }
}

function accessOf(v: any): Access | null {
  if (!v || typeof v !== 'object') return null
  return {
    hosts: strings(v.hosts),
    path: text(v.path),
    authMode: v.authMode === 'query' ? 'query' : 'basic',
    userMasked: text(v.userMasked),
    passwordLast2: text(v.passwordLast2),
    cspidMasked: text(v.cspidMasked),
    serviceIdMasked: text(v.serviceIdMasked),
    customerNoMasked: text(v.customerNoMasked),
    terminalIdMasked: text(v.terminalIdMasked),
    version: text(v.version),
    missing: strings(v.missing),
    savedBy: text(v.savedBy),
    savedAt: text(v.savedAt),
    lastTestAt: text(v.lastTestAt),
    lastTestOk: typeof v.lastTestOk === 'boolean' ? v.lastTestOk : null,
    lastTestMessage: text(v.lastTestMessage),
  }
}

/** A failed call in words; a 404 without the server's own message: this server has no prepaid-code functions yet. */
function apiError(err: any, fallback: string): string {
  const res = err?.response
  const message = res?.data && typeof res.data === 'object' ? res.data.message : ''
  if (res?.status === 404 && !(typeof message === 'string' && message.trim())) return t('eshop.prepaid.notDeployed')
  return eshopApiError(err, fallback, t)
}

/* ---------------- Form ---------------- */
function formOf(s: Settings): Form {
  return { ...s, alertEmails: s.alertEmails.join(', '), alertPhones: s.alertPhones.join(', ') }
}

function fingerprint(f: Form): string {
  return JSON.stringify({ ...f, ...Object.fromEntries(CAPS.map((k) => [k, text(f[k]).trim()])) })
}

/** The body of PUT /contentcard/settings/:outletId and what is wrong with the form; the body is null while anything is. */
function payloadOf(f: Form): { payload: Record<string, any> | null; errors: string[] } {
  const errors: string[] = []
  const caps: Record<string, number> = {}
  for (const k of CAPS) {
    const n = whole(f[k])
    if (!(n >= 0 && n <= 1000000)) errors.push(t('eshop.prepaid.errors.cap', { field: t(`eshop.prepaid.limits.${k}`) }))
    caps[k] = n
  }
  const emails = list(f.alertEmails)
  if (emails.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) errors.push(t('eshop.prepaid.errors.email'))
  if (!!f.customerNo.trim() !== !!f.terminalId.trim()) errors.push(t('eshop.prepaid.errors.pair'))
  if (errors.length) return { payload: null, errors }
  return {
    payload: {
      enabled: f.enabled === true,
      customerNo: f.customerNo.trim().slice(0, 120),
      terminalId: f.terminalId.trim().slice(0, 120),
      apiVersion: f.apiVersion.trim().slice(0, 120),
      ...caps,
      voucherOnlySkipsWinmax: f.voucherOnlySkipsWinmax === true,
      excludeFromLoyalty: f.excludeFromLoyalty === true,
      alertEmails: emails.slice(0, 20),
      alertPhones: list(f.alertPhones).slice(0, 20),
      voucherZoneId: f.voucherZoneId || '',
    },
    errors,
  }
}

/* ---------------- Page state ---------------- */
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const configured = ref(false)
const saved = ref<Settings | null>(null)
const form = ref<Form | null>(null)
const snapshot = ref('')
const problems = ref<string[]>([])
const warnings = ref<string[]>([])
const problemsRefused = ref(false)
const formErrors = ref<string[]>([])
const credentials = ref<Credentials | null>(null)
const zones = ref<Zone[]>([])
const senderEmailSet = ref(true)
const voucherItems = ref(0)

const dirty = computed(() => !!form.value && fingerprint(form.value) !== snapshot.value)

function takeView(d: any, takeForm: boolean) {
  configured.value = d?.configured === true
  problems.value = strings(d?.problems)
  warnings.value = strings(d?.warnings)
  problemsRefused.value = false
  senderEmailSet.value = d?.senderEmailSet !== false
  voucherItems.value = Number(d?.voucherItems) || 0
  zones.value = (Array.isArray(d?.zones) ? d.zones : [])
    .filter((z: any) => text(z?.zoneId))
    .map((z: any) => ({ zoneId: text(z.zoneId), name: text(z.name).trim() || text(z.zoneId) }))
  const c = d?.credentials
  credentials.value =
    c && typeof c === 'object'
      ? { pinKeyState: text(c.pinKeyState), envFallback: c.envFallback === true, saved: accessOf(c.saved) }
      : null
  saved.value = settingsOf(d?.settings)
  if (takeForm || !form.value) {
    form.value = formOf(saved.value)
    snapshot.value = fingerprint(form.value)
    formErrors.value = []
  }
}

let viewSeq = 0

async function load() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  const seq = ++viewSeq
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await axios.get(`${url}/contentcard/settings/${id}`)
    if (seq === viewSeq && id === outletId.value) takeView(data?.data || {}, true)
  } catch (err: any) {
    if (seq === viewSeq && id === outletId.value) {
      form.value = null
      saved.value = null
      loadError.value = apiError(err, t('eshop.prepaid.toast.loadFailed'))
    }
  } finally {
    if (id === outletId.value) loading.value = false
  }
}

/** The settings answer again after an action; the form only while it has no unsaved changes. */
async function refreshView() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  const seq = ++viewSeq
  try {
    const { data } = await axios.get(`${url}/contentcard/settings/${id}`)
    if (seq === viewSeq && id === outletId.value) takeView(data?.data || {}, !dirty.value)
  } catch (err: any) {
    if (seq === viewSeq && id === outletId.value)
      init({ message: apiError(err, t('eshop.prepaid.toast.loadFailed')), color: 'danger' })
  }
}

async function reload() {
  if (loading.value) return
  if (dirty.value) {
    const ok = await confirm({
      title: t('eshop.prepaid.discardTitle'),
      message: t('eshop.prepaid.discardMessage'),
      okText: t('eshop.prepaid.discardOk'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok) return
  }
  await load()
}

/* ---------------- Save ---------------- */
async function save() {
  const id = outletId.value
  const f = form.value
  if (!f || !id || saving.value) return
  const { payload, errors } = payloadOf(f)
  formErrors.value = errors
  if (!payload) {
    init({ message: errors[0], color: 'danger' })
    return
  }
  const wasOn = saved.value?.enabled === true
  if (payload.enabled && !wasOn) {
    const ok = await confirm({
      title: t('eshop.prepaid.switch.confirmOnTitle'),
      message: t('eshop.prepaid.switch.confirmOn'),
      okText: t('eshop.prepaid.switch.confirmOk'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok || id !== outletId.value) return
  } else if (!payload.enabled && wasOn) {
    const ok = await confirm({
      title: t('eshop.prepaid.switch.confirmOffTitle'),
      message: t('eshop.prepaid.switch.confirmOff'),
      okText: t('eshop.prepaid.switch.confirmOffOk'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok || id !== outletId.value) return
  }
  saving.value = true
  try {
    const { data } = await axios.put(`${url}/contentcard/settings/${id}`, payload)
    if (id !== outletId.value) return
    viewSeq++
    takeView(data?.data || {}, true)
    init(
      problems.value.length
        ? { message: t('eshop.prepaid.toast.savedWithProblems', { n: problems.value.length }), color: 'warning' }
        : { message: t('eshop.prepaid.toast.saved'), color: 'success' },
    )
  } catch (err: any) {
    const body = err?.response?.data
    if (id === outletId.value && err?.response?.status === 400 && Array.isArray(body?.data?.problems)) {
      problems.value = strings(body.data.problems)
      problemsRefused.value = true
    }
    init({ message: apiError(err, t('eshop.prepaid.toast.saveFailed')), color: 'danger' })
  } finally {
    saving.value = false
  }
}

const zoneOptions = computed(() => [
  { text: t('eshop.prepaid.delivery.voucherZoneNone'), value: '' },
  ...zones.value.map((z) => ({ text: z.name, value: z.zoneId })),
])

/* ---------------- Access (ContentCard credentials) ---------------- */
const accessInput = reactive({
  hosts: '',
  path: '',
  authMode: 'basic' as 'basic' | 'query',
  user: '',
  password: '',
  cspid: '',
  serviceId: '',
  customerNo: '',
  terminalId: '',
  version: '',
})
const accessBusy = ref<'' | 'save' | 'test' | 'remove'>('')
const accessNote = ref<Note | null>(null)

const access = computed(() => credentials.value?.saved || null)
const authOptions = computed(() => [
  { text: t('eshop.prepaid.access.authBasic'), value: 'basic' },
  { text: t('eshop.prepaid.access.authQuery'), value: 'query' },
])

/** The test host's test-case endpoint takes the login in the URL: pick it with one click. */
function useTestHost() {
  accessInput.hosts = 'ppu99.contentcard.com'
  accessInput.path = '/contentcard/contentcard.php'
  accessInput.authMode = 'basic'
}

const canSaveAccess = computed(
  () => !!accessInput.hosts.trim() && !!accessInput.user.trim() && !!accessInput.password.trim(),
)

async function saveAccess() {
  const id = outletId.value
  if (!id || accessBusy.value || !canSaveAccess.value) return
  accessBusy.value = 'save'
  accessNote.value = null
  try {
    const body: Record<string, any> = {
      hosts: list(accessInput.hosts),
      user: accessInput.user.trim(),
      password: accessInput.password.trim(),
      authMode: accessInput.authMode,
    }
    for (const k of ['path', 'cspid', 'serviceId', 'customerNo', 'terminalId', 'version'] as const) {
      const v = accessInput[k].trim()
      if (v) body[k] = v
    }
    const { data } = await axios.put(`${url}/contentcard/credentials/${id}`, body)
    if (id !== outletId.value) return
    accessInput.password = ''
    const view = accessOf(data?.data)
    if (view && credentials.value) credentials.value.saved = view
    accessNote.value = { ok: true, text: t('eshop.prepaid.access.savedNote') }
    init({ message: t('eshop.prepaid.toast.accessSaved'), color: 'success' })
    refreshView()
  } catch (err: any) {
    const message = apiError(err, t('eshop.prepaid.toast.accessSaveFailed'))
    if (id === outletId.value) accessNote.value = { ok: false, text: message }
    init({ message, color: 'danger' })
  } finally {
    accessBusy.value = ''
  }
}

async function testAccess() {
  const id = outletId.value
  if (!id || accessBusy.value || !access.value) return
  accessBusy.value = 'test'
  accessNote.value = null
  try {
    const { data } = await axios.post(`${url}/contentcard/credentials/${id}/test`, {})
    const d = data?.data || {}
    const ok = d.ok === true
    const message = text(d.message) || (ok ? t('eshop.prepaid.access.testOk') : t('eshop.prepaid.access.testFailed'))
    if (id === outletId.value) {
      const view = access.value
      if (view) {
        view.lastTestAt = new Date().toISOString()
        view.lastTestOk = ok
        view.lastTestMessage = message
      }
      refreshView()
    }
    init(ok ? { message, color: 'success' } : { message, color: 'danger', duration: 10000 })
  } catch (err: any) {
    const message = apiError(err, t('eshop.prepaid.toast.testFailed'))
    if (id === outletId.value) accessNote.value = { ok: false, text: message }
    init({ message, color: 'danger' })
  } finally {
    accessBusy.value = ''
  }
}

async function removeAccess() {
  const id = outletId.value
  if (!id || accessBusy.value || !access.value) return
  const ok = await confirm({
    title: t('eshop.prepaid.access.removeTitle'),
    message: t('eshop.prepaid.access.removeMessage'),
    okText: t('eshop.common.remove'),
    cancelText: t('eshop.common.cancel'),
    size: 'medium',
  })
  if (!ok || id !== outletId.value) return
  accessBusy.value = 'remove'
  accessNote.value = null
  try {
    const { data } = await axios.delete(`${url}/contentcard/credentials/${id}`)
    const removed = data?.data?.removed === true
    if (id === outletId.value) {
      if (removed && credentials.value) credentials.value.saved = null
      accessNote.value = {
        ok: removed,
        text: removed ? t('eshop.prepaid.toast.accessRemoved') : t('eshop.prepaid.toast.accessNothingRemoved'),
      }
      refreshView()
    }
    init({ message: accessNote.value?.text || '', color: removed ? 'success' : 'warning' })
  } catch (err: any) {
    const message = apiError(err, t('eshop.prepaid.toast.accessRemoveFailed'))
    if (id === outletId.value) accessNote.value = { ok: false, text: message }
    init({ message, color: 'danger' })
  } finally {
    accessBusy.value = ''
  }
}

/* ---------------- Outlet ---------------- */
function resetPage() {
  viewSeq++
  form.value = null
  saved.value = null
  snapshot.value = ''
  loadError.value = ''
  configured.value = false
  problems.value = []
  warnings.value = []
  problemsRefused.value = false
  formErrors.value = []
  credentials.value = null
  zones.value = []
  senderEmailSet.value = true
  voucherItems.value = 0
  Object.assign(accessInput, {
    hosts: '',
    path: '',
    authMode: 'basic',
    user: '',
    password: '',
    cspid: '',
    serviceId: '',
    customerNo: '',
    terminalId: '',
    version: '',
  })
  accessBusy.value = ''
  accessNote.value = null
}

watch(
  [outletId, hasEshop],
  () => {
    resetPage()
    load()
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div class="flex-1 min-w-[16rem]">
            <h1 class="va-h5">{{ t('eshop.prepaid.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.prepaid.intro') }}</p>
          </div>
          <div v-if="outletId && hasEshop" class="flex items-center gap-2 flex-wrap">
            <VaBadge v-if="dirty" :text="t('eshop.prepaid.unsaved')" color="warning" />
            <VaButton
              preset="secondary"
              size="small"
              icon="refresh"
              :loading="loading"
              :disabled="saving"
              @click="reload"
            >
              {{ t('eshop.common.refresh') }}
            </VaButton>
            <VaButton size="small" icon="save" :loading="saving" :disabled="!form || loading" @click="save">
              {{ t('eshop.prepaid.save') }}
            </VaButton>
          </div>
        </div>

        <div v-if="!outletId" class="text-center text-slate-500 py-4">{{ t('eshop.common.selectOutlet') }}</div>
        <div v-else-if="!outlet" class="text-center text-slate-500 py-4">{{ t('eshop.common.loadingOutlet') }}</div>
        <VaAlert v-else-if="!hasEshop" color="info" border="left">{{ t('eshop.common.noEshop') }}</VaAlert>
        <template v-else>
          <div v-if="loading && !form" class="text-center text-slate-500 py-4">{{ t('eshop.common.loading') }}</div>
          <VaAlert v-if="loadError" color="danger" border="left" class="mb-3">{{ loadError }}</VaAlert>
          <VaAlert v-if="formErrors.length" color="danger" border="left" class="mb-3">
            <div class="font-semibold mb-1">{{ t('eshop.prepaid.formErrorsTitle') }}</div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(e, i) in formErrors" :key="i">{{ e }}</li>
            </ul>
          </VaAlert>
          <VaAlert v-if="problems.length" color="danger" border="left" class="mb-3">
            <div class="font-semibold mb-1">
              {{ problemsRefused ? t('eshop.prepaid.problemsRefusedTitle') : t('eshop.prepaid.problemsTitle') }}
            </div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(p, i) in problems" :key="i" class="break-words">{{ p }}</li>
            </ul>
          </VaAlert>
          <VaAlert v-if="warnings.length" color="warning" border="left" class="mb-3">
            <div class="font-semibold mb-1">{{ t('eshop.prepaid.warningsTitle') }}</div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(w, i) in warnings" :key="i" class="break-words">{{ w }}</li>
            </ul>
          </VaAlert>
          <div v-if="form && !problems.length && !warnings.length" class="text-sm text-success mb-3">
            {{ t('eshop.prepaid.noProblems') }}
          </div>
          <VaAlert v-if="form && !configured" color="info" border="left" class="mb-3">{{
            t('eshop.prepaid.notConfigured')
          }}</VaAlert>

          <div v-if="form" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
            <div>
              <VaSwitch v-model="form.enabled" :label="t('eshop.prepaid.switch.enabled')" left-label size="small" />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.prepaid.switch.enabledHelp') }}</div>
            </div>
            <div class="text-sm">
              <div :class="senderEmailSet ? 'text-success' : 'text-danger'">
                {{ senderEmailSet ? t('eshop.prepaid.status.senderOk') : t('eshop.prepaid.status.senderMissing') }}
              </div>
              <div class="text-slate-600 mt-1">
                {{
                  voucherItems
                    ? t('eshop.prepaid.status.items', { n: voucherItems })
                    : t('eshop.prepaid.status.itemsNone')
                }}
              </div>
            </div>
          </div>
        </template>
      </VaCardContent>
    </VaCard>

    <template v-if="outletId && hasEshop && form">
      <!-- The ContentCard access: host, login, account ids; the password is never shown again -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.prepaid.access.title') }}</h2>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.prepaid.access.help') }}</p>
          <VaAlert v-if="credentials && credentials.pinKeyState !== 'ok'" color="warning" border="left" class="mt-3">
            {{
              credentials.pinKeyState === 'invalid'
                ? t('eshop.prepaid.access.pinKeyInvalid')
                : t('eshop.prepaid.access.pinKeyMissing')
            }}
          </VaAlert>
          <VaAlert
            v-if="credentials && !credentials.saved && credentials.envFallback"
            color="info"
            border="left"
            class="mt-3"
          >
            {{ t('eshop.prepaid.access.envFallback') }}
          </VaAlert>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div class="border border-slate-200 rounded-lg p-3 min-w-0">
              <h3 class="font-semibold text-sm">{{ t('eshop.prepaid.access.saved') }}</h3>
              <template v-if="access">
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-500">{{ t('eshop.prepaid.access.hosts') }}</dt>
                    <dd class="font-mono break-all">{{ access.hosts.join(', ') || '—' }}</dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-500">{{ t('eshop.prepaid.access.path') }}</dt>
                    <dd class="font-mono break-all">
                      {{ access.path || '—' }} ·
                      {{
                        access.authMode === 'query'
                          ? t('eshop.prepaid.access.authQuery')
                          : t('eshop.prepaid.access.authBasic')
                      }}
                    </dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-500">{{ t('eshop.prepaid.access.user') }}</dt>
                    <dd class="font-mono">
                      {{ access.userMasked || '—' }} ·
                      {{ t('eshop.prepaid.access.passwordEnding', { last2: access.passwordLast2 || '??' }) }}
                    </dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-500">{{ t('eshop.prepaid.access.ids') }}</dt>
                    <dd class="font-mono">
                      cspid {{ access.cspidMasked || '—' }} · serviceid {{ access.serviceIdMasked || '—' }}
                      <span v-if="access.customerNoMasked">
                        · {{ access.customerNoMasked }} / {{ access.terminalIdMasked }}</span
                      >
                      <span v-if="access.version"> · v{{ access.version }}</span>
                    </dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-500">{{ t('eshop.prepaid.access.savedAt') }}</dt>
                    <dd>
                      {{ formatDateTime(access.savedAt) || '—' }}
                      <span v-if="access.savedBy" class="text-slate-500 break-all">{{
                        t('eshop.prepaid.access.savedBy', { name: access.savedBy })
                      }}</span>
                    </dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-500">{{ t('eshop.prepaid.access.lastTest') }}</dt>
                    <dd class="flex items-center gap-2 flex-wrap">
                      <template v-if="access.lastTestAt">
                        <VaBadge
                          :text="
                            access.lastTestOk ? t('eshop.prepaid.access.testOk') : t('eshop.prepaid.access.testFailed')
                          "
                          :color="access.lastTestOk ? 'success' : 'danger'"
                        />
                        <span>{{ formatDateTime(access.lastTestAt) }}</span>
                      </template>
                      <span v-else>{{ t('eshop.common.never') }}</span>
                    </dd>
                  </div>
                </dl>
                <div v-if="access.missing.length" class="text-xs text-danger mt-2 break-words">
                  {{ t('eshop.prepaid.access.missing', { list: access.missing.join(', ') }) }}
                </div>
                <div
                  v-if="access.lastTestAt && access.lastTestMessage"
                  class="text-xs mt-2 break-words"
                  :class="access.lastTestOk ? 'text-success' : 'text-danger'"
                >
                  {{ access.lastTestMessage }}
                </div>
                <div class="flex items-center gap-2 flex-wrap mt-3">
                  <VaButton
                    preset="secondary"
                    size="small"
                    icon="mso-network_check"
                    :loading="accessBusy === 'test'"
                    :disabled="!!accessBusy"
                    @click="testAccess"
                  >
                    {{ t('eshop.prepaid.access.test') }}
                  </VaButton>
                  <VaButton
                    preset="secondary"
                    size="small"
                    color="danger"
                    icon="mso-delete"
                    :loading="accessBusy === 'remove'"
                    :disabled="!!accessBusy"
                    @click="removeAccess"
                  >
                    {{ t('eshop.common.remove') }}
                  </VaButton>
                </div>
              </template>
              <div v-else class="text-sm text-slate-500 mt-3">{{ t('eshop.prepaid.access.none') }}</div>
            </div>

            <form
              class="border border-slate-200 rounded-lg p-3 min-w-0 flex flex-col gap-3"
              autocomplete="off"
              @submit.prevent="saveAccess"
            >
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <h3 class="font-semibold text-sm">
                  {{ access ? t('eshop.prepaid.access.replaceTitle') : t('eshop.prepaid.access.addTitle') }}
                </h3>
                <VaButton preset="secondary" size="small" @click="useTestHost">{{
                  t('eshop.prepaid.access.useTestHost')
                }}</VaButton>
              </div>
              <VaInput
                v-model="accessInput.hosts"
                maxlength="300"
                autocomplete="off"
                :label="t('eshop.prepaid.access.hosts')"
                :messages="t('eshop.prepaid.access.hostsHelp')"
              />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <VaInput
                  v-model="accessInput.path"
                  maxlength="200"
                  autocomplete="off"
                  :label="t('eshop.prepaid.access.path')"
                  :messages="t('eshop.prepaid.access.pathHelp')"
                />
                <VaSelect
                  v-model="accessInput.authMode"
                  :options="authOptions"
                  value-by="value"
                  text-by="text"
                  :label="t('eshop.prepaid.access.authMode')"
                />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <VaInput
                  v-model="accessInput.user"
                  maxlength="200"
                  autocomplete="off"
                  :label="t('eshop.prepaid.access.user')"
                />
                <VaInput
                  v-model="accessInput.password"
                  type="password"
                  maxlength="500"
                  autocomplete="new-password"
                  :label="t('eshop.prepaid.access.password')"
                />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <VaInput
                  v-model="accessInput.cspid"
                  maxlength="120"
                  autocomplete="off"
                  :label="t('eshop.prepaid.access.cspid')"
                />
                <VaInput
                  v-model="accessInput.serviceId"
                  maxlength="120"
                  autocomplete="off"
                  :label="t('eshop.prepaid.access.serviceId')"
                />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <VaInput
                  v-model="accessInput.customerNo"
                  maxlength="120"
                  autocomplete="off"
                  :label="t('eshop.prepaid.access.customerNo')"
                />
                <VaInput
                  v-model="accessInput.terminalId"
                  maxlength="120"
                  autocomplete="off"
                  :label="t('eshop.prepaid.access.terminalId')"
                />
                <VaInput
                  v-model="accessInput.version"
                  maxlength="120"
                  autocomplete="off"
                  :label="t('eshop.prepaid.access.version')"
                />
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <VaButton
                  type="submit"
                  size="small"
                  icon="save"
                  :loading="accessBusy === 'save'"
                  :disabled="!!accessBusy || !canSaveAccess"
                >
                  {{ t('eshop.prepaid.access.save') }}
                </VaButton>
              </div>
              <p class="va-text-secondary text-xs">{{ t('eshop.prepaid.access.inputHelp') }}</p>
              <div
                v-if="accessNote"
                class="text-sm break-words"
                :class="accessNote.ok ? 'text-success' : 'text-danger'"
              >
                {{ accessNote.text }}
              </div>
            </form>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Account, delivery and limits -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.prepaid.delivery.title') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
            <VaSelect
              v-model="form.voucherZoneId"
              :options="zoneOptions"
              value-by="value"
              text-by="text"
              :label="t('eshop.prepaid.delivery.voucherZone')"
              :messages="t('eshop.prepaid.delivery.voucherZoneHelp')"
            />
            <div>
              <VaSwitch
                v-model="form.voucherOnlySkipsWinmax"
                :label="t('eshop.prepaid.delivery.skipWinmax')"
                left-label
                size="small"
              />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.prepaid.delivery.skipWinmaxHelp') }}</div>
            </div>
            <div>
              <VaSwitch
                v-model="form.excludeFromLoyalty"
                :label="t('eshop.prepaid.delivery.excludeLoyalty')"
                left-label
                size="small"
              />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.prepaid.delivery.excludeLoyaltyHelp') }}</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <VaInput
              v-model="form.alertEmails"
              maxlength="1000"
              :label="t('eshop.prepaid.delivery.alertEmails')"
              :messages="t('eshop.prepaid.delivery.alertEmailsHelp')"
            />
            <VaInput v-model="form.alertPhones" maxlength="500" :label="t('eshop.prepaid.delivery.alertPhones')" />
          </div>

          <h3 class="font-semibold text-sm mt-6">{{ t('eshop.prepaid.account.title') }}</h3>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.prepaid.account.help') }}</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
            <VaInput v-model="form.customerNo" maxlength="120" :label="t('eshop.prepaid.account.customerNo')" />
            <VaInput v-model="form.terminalId" maxlength="120" :label="t('eshop.prepaid.account.terminalId')" />
            <VaInput v-model="form.apiVersion" maxlength="120" :label="t('eshop.prepaid.account.apiVersion')" />
          </div>

          <h3 class="font-semibold text-sm mt-6">{{ t('eshop.prepaid.limits.title') }}</h3>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.prepaid.limits.help') }}</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
            <VaInput
              v-for="k in CAPS"
              :key="k"
              v-model="form[k]"
              type="number"
              inputmode="numeric"
              :label="t(`eshop.prepaid.limits.${k}`)"
            />
          </div>
        </VaCardContent>
      </VaCard>

      <div class="flex justify-end items-center gap-2 flex-wrap">
        <VaBadge v-if="dirty" :text="t('eshop.prepaid.unsaved')" color="warning" />
        <VaButton icon="save" :loading="saving" :disabled="loading" @click="save">{{
          t('eshop.prepaid.save')
        }}</VaButton>
      </div>
    </template>
  </div>
</template>
