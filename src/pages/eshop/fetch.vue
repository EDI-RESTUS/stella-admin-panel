<script setup lang="ts">
// POW on the Fetch marketplace (fetch.com.cy), for the navbar outlet — admins.
// The backend sends each linked Fetch store what its POW shop has free to sell
// in Winmax (changed numbers only) and, when switched on, the website prices
// (VAT included); it reads every linked store's listings from Fetch and
// matches them to POW's articles. GET /fetch/settings/:outletId gives the
// settings (defaults when none), their problems and warnings, the e-shop shops
// a store can sell from, the state of the keys and each store's last runs.
// Save PUTs mode + feed + stores (a strict body: exactly those keys); the
// server refuses a switched-on save while a problem remains. The keys (Partner
// ID + API key) are ONE PER SHOP, per Fetch system (test, live), and
// write-only: the server never returns an API key, only its last 4
// characters. Test asks Fetch which stores a key can use; the feed sends each
// linked store with a key that can. "Load stores", the status buttons and the
// listings work on the SAVED settings (mode and stores).
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useToast, useModal, defineVaDataTableColumns } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import { eshopApiError, formatDateTime, formatNumber, formatPrice } from './eshopHelpers'

type FetchEnvironment = 'dryRun' | 'test' | 'live'
type FetchSystem = 'test' | 'live'
type FetchStore = { storeId: string; name: string }
type StoreLink = { storeId: string; name: string; zoneId: string; active: boolean }
/** The settings as the server answered them. */
type FeedSettings = {
  enabled: boolean
  environment: FetchEnvironment
  stockSync: boolean
  priceSync: boolean
  stockBuffer: number
  unlimitedStock: number
  stores: StoreLink[]
}
/** The settings as typed: numbers as the fields hold them, unlimitedStock as a choice and a number. */
type FeedForm = Omit<FeedSettings, 'stockBuffer' | 'unlimitedStock'> & {
  stockBuffer: string | number
  unlimitedMode: 'leave' | 'send'
  unlimitedCount: string | number
}
/** One shop's key as the server answers it (never the API key itself). */
type KeyView = {
  clientId: string
  clientIdMasked: string
  label: string
  secretLast4: string
  savedBy: string
  savedAt: string
  lastTestAt: string
  lastTestOk: boolean | null
  lastTestMessage: string
  /** The stores its last successful test listed: the feed sends those with this key. */
  storeIds: string[]
  storesSeen: FetchStore[]
}
type Credentials = {
  keyState: string
  liveCallsAllowed: boolean
  /** The test system runs on Fetch's own API: test keys are used for sandbox stores only. */
  testSandboxOnly: boolean
  test: KeyView[]
  live: KeyView[]
}
/** What Load stores said about one saved key (clientId = the public Partner ID). */
type StoreKeyLine = {
  clientId: string
  clientIdMasked: string
  label: string
  ok: boolean
  message: string
  stores: number
}
type Shop = { zoneId: string; name: string; active: boolean }
type Note = { ok: boolean; text: string }
type RunAnswer = { title: string; at: string; color: 'success' | 'warning' | 'danger'; lines: string[] }

const ENVIRONMENTS: FetchEnvironment[] = ['dryRun', 'test', 'live']
const SYSTEMS: FetchSystem[] = ['test', 'live']
/** The server keeps at most this many stores (fetchSettings MAX_FETCH_STORES). */
const MAX_STORES = 20
/** Listings per page. */
const LIMIT = 50

const { t } = useI18n()
const { init } = useToast()
const { confirm } = useModal()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop } = useEshopOutlet()

/* ---------------- Reading answers ---------------- */
const text = (v: unknown): string => (v === undefined || v === null ? '' : String(v))
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : [])
const isEnvironment = (v: unknown): v is FetchEnvironment => ENVIRONMENTS.includes(v as FetchEnvironment)
/** A whole number typed in a field, or NaN. */
const whole = (v: unknown): number => {
  const s = text(v).trim()
  return /^-?\d+$/.test(s) ? Number(s) : NaN
}

function storesOf(v: unknown): FetchStore[] {
  const out: FetchStore[] = []
  for (const s of Array.isArray(v) ? v : []) {
    const storeId = text(s?.storeId).trim()
    if (storeId && !out.some((x) => x.storeId === storeId)) out.push({ storeId, name: text(s?.name).trim() })
  }
  return out
}

function settingsOf(s: any): FeedSettings {
  const src = s && typeof s === 'object' ? s : {}
  const stockBuffer = Number(src.stockBuffer)
  const unlimitedStock = Number(src.unlimitedStock)
  return {
    enabled: src.enabled === true,
    environment: isEnvironment(src.environment) ? src.environment : 'dryRun',
    stockSync: src.stockSync !== false,
    priceSync: src.priceSync === true,
    stockBuffer: Number.isInteger(stockBuffer) && stockBuffer >= 0 ? stockBuffer : 0,
    unlimitedStock: Number.isInteger(unlimitedStock) && unlimitedStock >= 0 ? unlimitedStock : -1,
    stores: (Array.isArray(src.stores) ? src.stores : [])
      .filter((x: any) => text(x?.storeId).trim())
      .map((x: any) => ({
        storeId: text(x.storeId).trim(),
        name: text(x.name).trim(),
        zoneId: text(x.zoneId).trim(),
        active: x.active !== false,
      })),
  }
}

function keyViewOf(v: any): KeyView | null {
  if (!v || typeof v !== 'object' || !text(v.clientId).trim()) return null
  return {
    clientId: text(v.clientId).trim(),
    clientIdMasked: text(v.clientIdMasked),
    label: text(v.label).trim(),
    secretLast4: text(v.secretLast4),
    savedBy: text(v.savedBy),
    savedAt: text(v.savedAt),
    lastTestAt: text(v.lastTestAt),
    lastTestOk: typeof v.lastTestOk === 'boolean' ? v.lastTestOk : null,
    lastTestMessage: text(v.lastTestMessage),
    storeIds: strings(v.storeIds),
    storesSeen: storesOf(v.storesSeen),
  }
}

/** The keys of one system as answered (a list; anything else = none). */
function keyViewsOf(v: unknown): KeyView[] {
  return (Array.isArray(v) ? v : []).map(keyViewOf).filter((k): k is KeyView => !!k)
}

function storeKeyLinesOf(v: unknown): StoreKeyLine[] {
  return (Array.isArray(v) ? v : []).map((k: any) => ({
    clientId: text(k?.clientId).trim(),
    clientIdMasked: text(k?.clientIdMasked),
    label: text(k?.label).trim(),
    ok: k?.ok === true,
    message: text(k?.message),
    stores: Number(k?.stores) || 0,
  }))
}

/** A failed call in words; a 404 without the server's own message: this server has no Fetch functions yet. */
function apiError(err: any, fallback: string): string {
  const res = err?.response
  const message = res?.data && typeof res.data === 'object' ? res.data.message : ''
  if (res?.status === 404 && !(typeof message === 'string' && message.trim())) return t('eshop.fetch.notDeployed')
  return eshopApiError(err, fallback, t)
}

function environmentName(e: FetchEnvironment): string {
  return t(`eshop.fetch.mode.names.${e}`)
}

function systemName(s: FetchSystem): string {
  return t(`eshop.fetch.keys.systems.${s}`)
}

/* ---------------- Form ---------------- */
function formOf(s: FeedSettings): FeedForm {
  return {
    enabled: s.enabled,
    environment: s.environment,
    stockSync: s.stockSync,
    priceSync: s.priceSync,
    stockBuffer: s.stockBuffer,
    unlimitedMode: s.unlimitedStock >= 0 ? 'send' : 'leave',
    unlimitedCount: s.unlimitedStock >= 0 ? s.unlimitedStock : 0,
    stores: s.stores.map((x) => ({ ...x })),
  }
}

/** The form as compared for "unsaved changes": numbers as text, the fixed number only when it is sent. */
function fingerprint(f: FeedForm): string {
  return JSON.stringify({
    ...f,
    stockBuffer: text(f.stockBuffer).trim(),
    unlimitedCount: f.unlimitedMode === 'send' ? text(f.unlimitedCount).trim() : '',
  })
}

/** The body of PUT /fetch/settings/:outletId and what is wrong with the form; the body is null while anything is. */
function payloadOf(f: FeedForm): { payload: Record<string, any> | null; errors: string[] } {
  const errors: string[] = []
  const stockBuffer = whole(f.stockBuffer)
  if (!(stockBuffer >= 0 && stockBuffer <= 1000)) errors.push(t('eshop.fetch.errors.stockBuffer'))
  const unlimitedStock = f.unlimitedMode === 'send' ? whole(f.unlimitedCount) : -1
  if (f.unlimitedMode === 'send' && !(unlimitedStock >= 0 && unlimitedStock <= 9999)) {
    errors.push(t('eshop.fetch.errors.unlimitedStock'))
  }
  if (f.stores.length > MAX_STORES) errors.push(t('eshop.fetch.errors.storesCount', { n: MAX_STORES }))
  if (errors.length) return { payload: null, errors }
  return {
    payload: {
      enabled: f.enabled === true,
      environment: f.environment,
      stockSync: f.stockSync === true,
      priceSync: f.priceSync === true,
      stockBuffer,
      unlimitedStock,
      stores: f.stores.map((s) => ({
        storeId: s.storeId,
        name: s.name.trim().slice(0, 120),
        zoneId: s.zoneId,
        active: s.active === true,
      })),
    },
    errors,
  }
}

/* ---------------- Page state ---------------- */
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const configured = ref(false)
/** The settings as last loaded or saved: what the runs, "Load stores" and the listings use. */
const saved = ref<FeedSettings | null>(null)
const form = ref<FeedForm | null>(null)
const snapshot = ref('')
const problems = ref<string[]>([])
const warnings = ref<string[]>([])
// true while `problems` belong to settings the server refused (not the saved ones).
const problemsRefused = ref(false)
const formErrors = ref<string[]>([])
const shops = ref<Shop[]>([])
const credentials = ref<Credentials | null>(null)
const states = ref<any[]>([])

const dirty = computed(() => !!form.value && fingerprint(form.value) !== snapshot.value)
const liveOffHere = computed(() => !!credentials.value && !credentials.value.liveCallsAllowed)

/** Take an answer of GET or PUT /fetch/settings; the form too when `takeForm` (or when there is none yet). */
function takeView(d: any, takeForm: boolean) {
  configured.value = d?.configured === true
  problems.value = strings(d?.problems)
  warnings.value = strings(d?.warnings)
  problemsRefused.value = false
  shops.value = (Array.isArray(d?.shops) ? d.shops : [])
    .filter((s: any) => text(s?.zoneId))
    .map((s: any) => ({
      zoneId: text(s.zoneId),
      name: text(s.name).trim() || text(s.zoneId),
      active: s.active !== false,
    }))
  const c = d?.credentials
  credentials.value = null
  if (c && typeof c === 'object') {
    credentials.value = {
      keyState: text(c.keyState),
      liveCallsAllowed: c.liveCallsAllowed === true,
      testSandboxOnly: c.testSandboxOnly === true,
      test: keyViewsOf(c.test),
      live: keyViewsOf(c.live),
    }
  }
  states.value = Array.isArray(d?.states) ? d.states : []
  saved.value = settingsOf(d?.settings)
  if (takeForm || !form.value) {
    form.value = formOf(saved.value)
    snapshot.value = fingerprint(form.value)
    formErrors.value = []
  }
}

// Only the latest answer of GET /fetch/settings is taken (a save's answer counts as one).
let viewSeq = 0

async function load() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  const seq = ++viewSeq
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await axios.get(`${url}/fetch/settings/${id}`)
    if (seq === viewSeq && id === outletId.value) takeView(data?.data || {}, true)
  } catch (err: any) {
    if (seq === viewSeq && id === outletId.value) {
      form.value = null
      saved.value = null
      loadError.value = apiError(err, t('eshop.fetch.toast.loadFailed'))
    }
  } finally {
    if (id === outletId.value) loading.value = false
  }
}

/** The settings answer again after an action (keys, problems, last runs); the form only while it has no unsaved changes. */
async function refreshView() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  const seq = ++viewSeq
  try {
    const { data } = await axios.get(`${url}/fetch/settings/${id}`)
    if (seq === viewSeq && id === outletId.value) takeView(data?.data || {}, !dirty.value)
  } catch (err: any) {
    if (seq === viewSeq && id === outletId.value) {
      init({ message: apiError(err, t('eshop.fetch.toast.loadFailed')), color: 'danger' })
    }
  }
}

async function reload() {
  if (loading.value) return
  if (dirty.value) {
    const ok = await confirm({
      title: t('eshop.fetch.discardTitle'),
      message: t('eshop.fetch.discardMessage'),
      okText: t('eshop.fetch.discardOk'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok) return
  }
  await load()
  reloadListingsFromFirstPage()
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
  // Starting or stopping real sends (test or live system) is confirmed; a dry run sends nothing.
  const wasOn = saved.value?.enabled === true
  const wasEnvironment = saved.value?.environment
  if (payload.enabled && payload.environment !== 'dryRun' && (!wasOn || payload.environment !== wasEnvironment)) {
    const ok = await confirm({
      title: t('eshop.fetch.confirmOn.title'),
      message: payload.environment === 'live' ? t('eshop.fetch.confirmOn.live') : t('eshop.fetch.confirmOn.test'),
      okText: t('eshop.fetch.confirmOn.ok'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok || id !== outletId.value) return
  } else if (!payload.enabled && wasOn && wasEnvironment !== 'dryRun') {
    const ok = await confirm({
      title: t('eshop.fetch.confirmOff.title'),
      message: t('eshop.fetch.confirmOff.message'),
      okText: t('eshop.fetch.confirmOff.ok'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok || id !== outletId.value) return
  }
  saving.value = true
  try {
    const { data } = await axios.put(`${url}/fetch/settings/${id}`, payload)
    if (id !== outletId.value) return
    viewSeq++ // a read started before this answer must not replace it
    takeView(data?.data || {}, true)
    if (problems.value.length) {
      init({ message: t('eshop.fetch.toast.savedWithProblems', { n: problems.value.length }), color: 'warning' })
    } else {
      init({ message: t('eshop.fetch.toast.saved'), color: 'success' })
    }
    reloadListingsFromFirstPage()
  } catch (err: any) {
    const body = err?.response?.data
    if (id === outletId.value && err?.response?.status === 400 && Array.isArray(body?.data?.problems)) {
      problems.value = strings(body.data.problems)
      problemsRefused.value = true
    }
    init({ message: apiError(err, t('eshop.fetch.toast.saveFailed')), color: 'danger' })
  } finally {
    saving.value = false
  }
}

/* ---------------- Mode and feed ---------------- */
const environmentOptions = computed(() =>
  ENVIRONMENTS.map((e) => ({
    text: e === 'live' && liveOffHere.value ? t('eshop.fetch.mode.liveOffOption') : environmentName(e),
    value: e,
  })),
)

const modeNote = computed(() => {
  const e = form.value?.environment
  if (e === 'test') return t('eshop.fetch.mode.notes.test')
  if (e === 'live') return t('eshop.fetch.mode.notes.live')
  return t('eshop.fetch.mode.notes.dryRun')
})

/** The form's mode is not the saved one: the runs, "Load stores" and the listings stay on the saved one. */
const modeNotSaved = computed(() => !!form.value && !!saved.value && form.value.environment !== saved.value.environment)

const unlimitedOptions = computed(() => [
  { text: t('eshop.fetch.feed.unlimitedLeave'), value: 'leave' },
  { text: t('eshop.fetch.feed.unlimitedSend'), value: 'send' },
])

/* ---------------- Stores ---------------- */
/** The answer of GET /fetch/stores: the stores of the SAVED mode. */
const storeList = ref<{
  environment: FetchEnvironment
  ok: boolean
  message: string
  stores: FetchStore[]
  keys: StoreKeyLine[]
} | null>(null)
const storesLoading = ref(false)
const storeToAdd = ref('')

const shopOptions = computed(() =>
  shops.value.map((s) => ({
    text: s.active ? s.name : t('eshop.fetch.stores.shopInactive', { name: s.name }),
    value: s.zoneId,
  })),
)

/** A linked store's shop options: with its stored shop when that is no longer one of the e-shop's shops. */
function shopOptionsFor(link: StoreLink) {
  if (!link.zoneId || shops.value.some((s) => s.zoneId === link.zoneId)) return shopOptions.value
  return [...shopOptions.value, { text: t('eshop.fetch.stores.shopUnknown'), value: link.zoneId }]
}

function shopName(zoneId: string): string {
  return shops.value.find((s) => s.zoneId === zoneId)?.name || ''
}

/** "Name (id)", or the id alone. */
function storeLabel(s: { storeId: string; name?: string }): string {
  const name = text(s.name).trim()
  return name && name !== s.storeId ? t('eshop.fetch.stores.label', { name, id: s.storeId }) : s.storeId
}

/** A store as the saved or edited links name it, else its id. */
function storeNameOf(storeId: string): string {
  const link =
    saved.value?.stores.find((s) => s.storeId === storeId) || form.value?.stores.find((s) => s.storeId === storeId)
  return link ? storeLabel(link) : storeId
}

/** The stores of the form's mode this page knows: the last "Load stores" of that mode and the stores its tested key saw. */
const knownStores = computed<FetchStore[]>(() => {
  const environment = form.value?.environment
  if (!environment) return []
  const found: FetchStore[] = []
  const add = (list: FetchStore[]) => {
    for (const s of list) {
      const i = found.findIndex((x) => x.storeId === s.storeId)
      if (i < 0) found.push(s)
      else if (!found[i].name && s.name) found[i] = s
    }
  }
  if (storeList.value?.environment === environment) add(storeList.value.stores)
  if (environment !== 'dryRun') for (const k of credentials.value?.[environment] || []) add(k.storesSeen)
  return found
})

const addOptions = computed(() => {
  const linked = new Set((form.value?.stores || []).map((s) => s.storeId))
  return knownStores.value.filter((s) => !linked.has(s.storeId)).map((s) => ({ text: storeLabel(s), value: s.storeId }))
})

/** A linked store missing from the known stores of the form's mode (when some are known): likely of another mode. */
function notInMode(link: StoreLink): boolean {
  return knownStores.value.length > 0 && !knownStores.value.some((s) => s.storeId === link.storeId)
}

const storeListLine = computed<Note | null>(() => {
  const l = storeList.value
  if (!l) return null
  if (!l.ok) return { ok: false, text: l.message || t('eshop.fetch.toast.storesFailed') }
  return {
    ok: true,
    text: t('eshop.fetch.stores.loaded', { n: l.stores.length, mode: environmentName(l.environment) }),
  }
})

async function loadStores() {
  const id = outletId.value
  if (!id || storesLoading.value) return
  storesLoading.value = true
  try {
    const { data } = await axios.get(`${url}/fetch/stores/${id}`)
    if (id !== outletId.value) return
    const d = data?.data || {}
    storeList.value = {
      environment: isEnvironment(d.environment) ? d.environment : saved.value?.environment || 'dryRun',
      ok: d.ok === true,
      message: text(d.message),
      stores: storesOf(d.stores),
      keys: storeKeyLinesOf(d.keys),
    }
    if (d.ok !== true) init({ message: text(d.message) || t('eshop.fetch.toast.storesFailed'), color: 'danger' })
    // Load stores tests every saved key of the mode: their last test and stores changed too
    refreshView()
  } catch (err: any) {
    if (id === outletId.value) init({ message: apiError(err, t('eshop.fetch.toast.storesFailed')), color: 'danger' })
  } finally {
    storesLoading.value = false
  }
}

/** A dry-run sample store is named after its shop ("<shop> (dry run)"): that shop, when exactly one matches. */
function sampleShopOf(store: FetchStore): string {
  if (!store.storeId.startsWith('DRY-')) return ''
  const hits = shops.value.filter((s) => store.name === `${s.name} (dry run)`)
  return hits.length === 1 ? hits[0].zoneId : ''
}

function addStore() {
  const f = form.value
  const store = knownStores.value.find((s) => s.storeId === storeToAdd.value)
  if (!f || !store || f.stores.some((s) => s.storeId === store.storeId)) return
  if (f.stores.length >= MAX_STORES) {
    init({ message: t('eshop.fetch.errors.storesCount', { n: MAX_STORES }), color: 'danger' })
    return
  }
  f.stores.push({ storeId: store.storeId, name: store.name.slice(0, 120), zoneId: sampleShopOf(store), active: true })
  storeToAdd.value = ''
}

async function removeStore(storeId: string) {
  const f = form.value
  const link = f?.stores.find((s) => s.storeId === storeId)
  if (!f || !link) return
  const ok = await confirm({
    title: t('eshop.fetch.stores.removeTitle'),
    message: t('eshop.fetch.stores.removeMessage', { name: storeLabel(link) }),
    okText: t('eshop.common.remove'),
    cancelText: t('eshop.common.cancel'),
    size: 'medium',
  })
  if (!ok || form.value !== f) return
  f.stores = f.stores.filter((s) => s.storeId !== storeId)
}

/* ---------------- Keys (one per shop) ---------------- */
type KeyInput = { label: string; clientId: string; clientSecret: string }
const keyInputs = reactive<Record<FetchSystem, KeyInput>>({
  test: { label: '', clientId: '', clientSecret: '' },
  live: { label: '', clientId: '', clientSecret: '' },
})
/** Saving is per system (the add form); testing and removing per key ("system:clientId"). */
const keySaving = reactive<Record<FetchSystem, boolean>>({ test: false, live: false })
const keyBusy = reactive<Record<string, 'test' | 'remove'>>({})
/** The last answer of a key action, shown under the system's add form. */
const keyNotes = reactive<Record<FetchSystem, Note | null>>({ test: null, live: null })

const keyRef = (system: FetchSystem, clientId: string) => `${system}:${clientId}`

function keysOf(system: FetchSystem): KeyView[] {
  return credentials.value?.[system] || []
}

/** The shop name Fetch gave the key, else its masked Partner ID. */
function keyLabel(k: KeyView): string {
  return k.label || k.clientIdMasked
}

function canSaveKey(system: FetchSystem): boolean {
  return !!keyInputs[system].clientId.trim() && !!keyInputs[system].clientSecret.trim()
}

async function saveKey(system: FetchSystem) {
  const id = outletId.value
  const input = keyInputs[system]
  const label = input.label.trim().slice(0, 120)
  const clientId = input.clientId.trim()
  const clientSecret = input.clientSecret.trim()
  if (!id || keySaving[system] || !clientId || !clientSecret) return
  keySaving[system] = true
  keyNotes[system] = null
  try {
    const { data } = await axios.put(`${url}/fetch/credentials/${id}`, {
      environment: system,
      ...(label ? { label } : {}),
      clientId,
      clientSecret,
    })
    if (id !== outletId.value) return
    input.label = ''
    input.clientId = ''
    input.clientSecret = ''
    const view = keyViewOf(data?.data)
    if (view && credentials.value) {
      const list = credentials.value[system]
      const i = list.findIndex((k) => k.clientId === view.clientId)
      if (i < 0) list.push(view)
      else list[i] = view
    }
    keyNotes[system] = { ok: true, text: t('eshop.fetch.keys.savedNote', { label: view ? keyLabel(view) : clientId }) }
    init({ message: t('eshop.fetch.toast.keySaved', { system: systemName(system) }), color: 'success' })
    refreshView()
  } catch (err: any) {
    const message = apiError(err, t('eshop.fetch.toast.keySaveFailed'))
    if (id === outletId.value) keyNotes[system] = { ok: false, text: message }
    init({ message, color: 'danger' })
  } finally {
    keySaving[system] = false
  }
}

async function testKey(system: FetchSystem, key: KeyView) {
  const id = outletId.value
  const ref = keyRef(system, key.clientId)
  if (!id || keyBusy[ref]) return
  keyBusy[ref] = 'test'
  keyNotes[system] = null
  try {
    const { data } = await axios.post(`${url}/fetch/credentials/${id}/test`, {
      environment: system,
      clientId: key.clientId,
    })
    const d = data?.data || {}
    const ok = d.ok === true
    const message = text(d.message) || (ok ? t('eshop.fetch.keys.testOk') : t('eshop.fetch.keys.testFailed'))
    if (id === outletId.value) {
      // the key's "Last test" shows the answer at once; the settings answer read again below confirms it
      const view = keysOf(system).find((k) => k.clientId === key.clientId)
      if (view) {
        view.lastTestAt = new Date().toISOString()
        view.lastTestOk = ok
        view.lastTestMessage = message
        if (ok) {
          view.storesSeen = storesOf(d.stores)
          view.storeIds = view.storesSeen.map((s) => s.storeId)
        }
      }
      refreshView()
    }
    init(ok ? { message, color: 'success' } : { message, color: 'danger', duration: 10000 })
  } catch (err: any) {
    const message = apiError(err, t('eshop.fetch.toast.keyTestFailed'))
    if (id === outletId.value) keyNotes[system] = { ok: false, text: message }
    init({ message, color: 'danger' })
  } finally {
    delete keyBusy[ref]
  }
}

async function removeKey(system: FetchSystem, key: KeyView) {
  const id = outletId.value
  const ref = keyRef(system, key.clientId)
  if (!id || keyBusy[ref]) return
  const ok = await confirm({
    title: t('eshop.fetch.keys.removeTitle', { label: keyLabel(key) }),
    message: t('eshop.fetch.keys.removeMessage'),
    okText: t('eshop.common.remove'),
    cancelText: t('eshop.common.cancel'),
    size: 'medium',
  })
  if (!ok || id !== outletId.value) return
  keyBusy[ref] = 'remove'
  keyNotes[system] = null
  try {
    const { data } = await axios.delete(`${url}/fetch/credentials/${id}/${system}/${encodeURIComponent(key.clientId)}`)
    const removed = data?.data?.removed === true
    const message = removed
      ? t('eshop.fetch.toast.keyRemoved', { system: systemName(system) })
      : t('eshop.fetch.toast.keyNothingRemoved', { system: systemName(system) })
    if (id === outletId.value) {
      if (removed && credentials.value) {
        credentials.value[system] = credentials.value[system].filter((k) => k.clientId !== key.clientId)
      }
      keyNotes[system] = { ok: removed, text: message }
      refreshView()
    }
    init({ message, color: removed ? 'success' : 'warning' })
  } catch (err: any) {
    const message = apiError(err, t('eshop.fetch.toast.keyRemoveFailed'))
    if (id === outletId.value) keyNotes[system] = { ok: false, text: message }
    init({ message, color: 'danger' })
  } finally {
    delete keyBusy[ref]
  }
}

/* ---------------- Status and runs ---------------- */
const runBusy = ref<'' | 'listings' | 'stock' | 'prices'>('')
const runAnswer = ref<RunAnswer | null>(null)

const statusRows = computed(() => {
  const byStore = new Map<string, any>()
  for (const st of states.value) if (st?.storeId) byStore.set(String(st.storeId), st)
  return (saved.value?.stores || []).map((link) => ({ link, state: byStore.get(link.storeId) || null }))
})

function listingsStateText(st: any): string {
  if (!st?.lastListingsAt) return t('eshop.common.never')
  return t('eshop.fetch.status.listingsValue', {
    when: formatDateTime(text(st.lastListingsAt)),
    total: Number(st.listingsTotal) || 0,
    matched: Number(st.listingsMatched) || 0,
  })
}

/** "15 Oct 2026, 10:02:00 — 3 sent; 1 refused", or never. */
function runStateText(at: unknown, summary: unknown): string {
  const when = formatDateTime(text(at))
  if (!when) return t('eshop.common.never')
  const s = text(summary).trim()
  return s ? `${when} — ${s}` : when
}

function listingsLine(r: any): string {
  const parts = [
    t('eshop.fetch.status.listingsLine', {
      store: storeNameOf(text(r?.storeId)),
      total: Number(r?.total) || 0,
      matched: Number(r?.matched) || 0,
    }),
  ]
  if (r?.complete === false) parts.push(t('eshop.fetch.status.notComplete'))
  if (r?.error) parts.push(text(r.error))
  return parts.join(' — ')
}

function pushLine(r: any): string {
  const store = storeNameOf(text(r?.storeId))
  const sent = Number(r?.sent) || 0
  const refused = Number(r?.refused) || 0
  const parts = [
    sent || refused
      ? t('eshop.fetch.status.pushLine', { store, sent, refused })
      : t('eshop.fetch.status.pushNothing', { store }),
  ]
  if (r?.error) parts.push(text(r.error))
  return parts.join(' — ')
}

/** All went through: green; some stores answered: amber; none: red. */
function answerColor(ok: boolean, stores: unknown[]): RunAnswer['color'] {
  if (ok) return 'success'
  return stores.length ? 'warning' : 'danger'
}

/** POST …/listings/refresh (every active linked store) or …/sync (stock or prices); the answer stays on the page. */
async function run(kind: 'listings' | 'stock' | 'prices') {
  const id = outletId.value
  if (!id || runBusy.value) return
  runBusy.value = kind
  const title =
    kind === 'listings'
      ? t('eshop.fetch.status.readListings')
      : kind === 'stock'
        ? t('eshop.fetch.status.sendStock')
        : t('eshop.fetch.status.sendPrices')
  try {
    let r: any
    if (kind === 'listings') {
      const { data } = await axios.post(`${url}/fetch/listings/${id}/refresh`, {})
      r = data?.data || {}
    } else {
      const { data } = await axios.post(`${url}/fetch/sync/${id}`, { what: kind })
      r = (kind === 'stock' ? data?.data?.stock : data?.data?.prices) || {}
    }
    const stores: any[] = Array.isArray(r.stores) ? r.stores : []
    const lines = [
      ...(text(r.message) ? [text(r.message)] : []),
      ...stores.map((s) => (kind === 'listings' ? listingsLine(s) : pushLine(s))),
    ]
    const ok = r.ok === true
    const color = answerColor(ok, stores)
    if (id === outletId.value) {
      runAnswer.value = {
        title,
        at: new Date().toISOString(),
        color,
        lines: lines.length ? lines : [t('eshop.fetch.status.noneRun')],
      }
    }
    const sent = stores.reduce((n, s) => n + (Number(s?.sent) || 0), 0)
    const message = ok
      ? kind === 'listings'
        ? t('eshop.fetch.toast.listingsRead')
        : t('eshop.fetch.toast.sent', { n: sent })
      : text(r.message) || t('eshop.fetch.toast.someFailed')
    init({ message, color })
  } catch (err: any) {
    const message = apiError(err, t('eshop.fetch.toast.runFailed'))
    if (id === outletId.value) {
      runAnswer.value = { title, at: new Date().toISOString(), color: 'danger', lines: [message] }
    }
    init({ message, color: 'danger' })
  } finally {
    runBusy.value = ''
    if (id === outletId.value) {
      refreshView()
      loadListings()
    }
  }
}

/* ---------------- Listings ---------------- */
const listStore = ref('')
const listMatched = ref<'all' | 'yes' | 'no'>('all')
const listSearch = ref('')
const listPage = ref(1)
const listLoading = ref(false)
const listError = ref('')
const listRows = ref<any[]>([])
const listTotal = ref(0)
const listPages = computed(() => Math.max(1, Math.ceil(listTotal.value / LIMIT)))

const listStoreOptions = computed(() =>
  (saved.value?.stores || []).map((s) => ({
    text: s.active ? storeLabel(s) : t('eshop.fetch.listings.storePaused', { name: storeLabel(s) }),
    value: s.storeId,
  })),
)

const matchedOptions = computed(() => [
  { text: t('eshop.fetch.listings.matchedAll'), value: 'all' },
  { text: t('eshop.fetch.listings.matchedYes'), value: 'yes' },
  { text: t('eshop.fetch.listings.matchedNo'), value: 'no' },
])

const listEmptyText = computed(() =>
  listMatched.value === 'all' && !text(listSearch.value).trim()
    ? t('eshop.fetch.listings.emptyNone')
    : t('eshop.fetch.listings.emptyFilter'),
)

// Only the answer to the latest request is shown (typing fires several).
let listSeq = 0

async function loadListings() {
  const id = outletId.value
  const storeId = listStore.value
  const seq = ++listSeq
  if (!id || !hasEshop.value || !storeId) {
    listRows.value = []
    listTotal.value = 0
    listError.value = ''
    listLoading.value = false
    return
  }
  listLoading.value = true
  listError.value = ''
  try {
    const params: Record<string, string | number> = {
      storeId,
      matched: listMatched.value,
      page: listPage.value,
      limit: LIMIT,
    }
    const q = text(listSearch.value).trim().slice(0, 60).trim()
    if (q) params.q = q
    const { data } = await axios.get(`${url}/fetch/listings/${id}`, { params })
    if (seq !== listSeq) return
    const d = data?.data || {}
    listRows.value = Array.isArray(d.rows) ? d.rows : []
    listTotal.value = Number(d.total) || 0
  } catch (err: any) {
    if (seq !== listSeq) return
    listRows.value = []
    listTotal.value = 0
    listError.value = apiError(err, t('eshop.fetch.toast.listingsLoadFailed'))
  } finally {
    if (seq === listSeq) listLoading.value = false
  }
}

/** Back to page 1 (its watcher loads) or, already there, load. */
function reloadListingsFromFirstPage() {
  if (listPage.value !== 1) listPage.value = 1
  else loadListings()
}

function matchedByText(m: unknown): string {
  if (m === 'ref') return t('eshop.fetch.listings.byRef')
  if (m === 'barcode') return t('eshop.fetch.listings.byBarcode')
  return ''
}

const listColumns = computed(() =>
  defineVaDataTableColumns([
    { label: t('eshop.fetch.listings.columns.name'), key: 'name' },
    { label: t('eshop.fetch.listings.columns.barcode'), key: 'barcode' },
    { label: t('eshop.fetch.listings.columns.ourCode'), key: 'articleCode' },
    { label: t('eshop.fetch.listings.columns.fetchStock'), key: 'fetchStockCount', thAlign: 'right' },
    { label: t('eshop.fetch.listings.columns.sentStock'), key: 'pushedStock', thAlign: 'right' },
    { label: t('eshop.fetch.listings.columns.fetchPrice'), key: 'fetchPrice', thAlign: 'right' },
    { label: t('eshop.fetch.listings.columns.sentPrice'), key: 'pushedPrice', thAlign: 'right' },
    { label: t('eshop.fetch.listings.columns.error'), key: 'lastError' },
  ]),
)

// The first saved store when the one picked is gone (another outlet, or removed and saved).
watch(listStoreOptions, (options) => {
  if (!options.some((o) => o.value === listStore.value)) listStore.value = options[0]?.value || ''
})
watch([listStore, listMatched], reloadListingsFromFirstPage)
watch(listPage, loadListings)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(listSearch, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reloadListingsFromFirstPage, 400)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

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
  shops.value = []
  credentials.value = null
  states.value = []
  storeList.value = null
  storeToAdd.value = ''
  for (const s of SYSTEMS) {
    keyInputs[s].label = ''
    keyInputs[s].clientId = ''
    keyInputs[s].clientSecret = ''
    keyNotes[s] = null
    keySaving[s] = false
  }
  for (const k of Object.keys(keyBusy)) delete keyBusy[k]
  runAnswer.value = null
  listStore.value = ''
  listSearch.value = ''
  listRows.value = []
  listTotal.value = 0
  listError.value = ''
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
            <h1 class="va-h5">{{ t('eshop.fetch.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.fetch.intro') }}</p>
          </div>
          <div v-if="outletId && hasEshop" class="flex items-center gap-2 flex-wrap">
            <VaBadge v-if="dirty" :text="t('eshop.fetch.unsaved')" color="warning" />
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
              {{ t('eshop.fetch.save') }}
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
            <div class="font-semibold mb-1">{{ t('eshop.fetch.formErrorsTitle') }}</div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(e, i) in formErrors" :key="i">{{ e }}</li>
            </ul>
          </VaAlert>
          <VaAlert v-if="problems.length" color="danger" border="left" class="mb-3">
            <div class="font-semibold mb-1">
              {{ problemsRefused ? t('eshop.fetch.problemsRefusedTitle') : t('eshop.fetch.problemsTitle') }}
            </div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(p, i) in problems" :key="i" class="break-words">{{ p }}</li>
            </ul>
          </VaAlert>
          <VaAlert v-if="warnings.length" color="warning" border="left" class="mb-3">
            <div class="font-semibold mb-1">{{ t('eshop.fetch.warningsTitle') }}</div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(w, i) in warnings" :key="i" class="break-words">{{ w }}</li>
            </ul>
          </VaAlert>
          <div v-if="form && !problems.length && !warnings.length" class="text-sm text-success mb-3">
            {{ t('eshop.fetch.noProblems') }}
          </div>
          <VaAlert v-if="form && !configured" color="info" border="left" class="mb-3">
            {{ t('eshop.fetch.notConfigured') }}
          </VaAlert>

          <div v-if="form" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <VaSelect
              v-model="form.environment"
              :options="environmentOptions"
              value-by="value"
              text-by="text"
              :label="t('eshop.fetch.mode.label')"
            />
            <div class="md:col-span-2 text-sm self-center">
              <p>{{ modeNote }}</p>
              <p v-if="form.environment === 'live' && liveOffHere" class="text-danger mt-1">
                {{ t('eshop.fetch.mode.liveOff') }}
              </p>
              <p v-if="modeNotSaved && saved" class="text-warning mt-1">
                {{ t('eshop.fetch.mode.notSaved', { mode: environmentName(saved.environment) }) }}
              </p>
            </div>
          </div>
        </template>
      </VaCardContent>
    </VaCard>

    <template v-if="outletId && hasEshop && form">
      <!-- Keys: one Partner ID + API key per shop, per Fetch system; an API key is never shown again -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.fetch.keys.title') }}</h2>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.fetch.keys.help') }}</p>
          <VaAlert v-if="credentials && credentials.keyState !== 'ok'" color="warning" border="left" class="mt-3">
            {{
              credentials.keyState === 'invalid'
                ? t('eshop.fetch.keys.serverKeyInvalid')
                : t('eshop.fetch.keys.serverKeyMissing')
            }}
          </VaAlert>
          <VaAlert v-if="credentials && credentials.testSandboxOnly" color="info" border="left" class="mt-3">
            {{ t('eshop.fetch.keys.sandboxOnly') }}
          </VaAlert>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div v-for="system in SYSTEMS" :key="system" class="border border-slate-200 rounded-lg p-3 min-w-0">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <h3 class="font-semibold text-sm">
                  {{ systemName(system) }}
                  <span class="text-slate-500 font-normal">
                    {{ t('eshop.fetch.keys.count', { n: keysOf(system).length }) }}
                  </span>
                </h3>
                <VaBadge v-if="form.environment === system" :text="t('eshop.fetch.keys.inUse')" color="primary" />
              </div>
              <p v-if="system === 'live' && liveOffHere" class="text-xs text-warning mt-1">
                {{ t('eshop.fetch.keys.liveOff') }}
              </p>

              <div v-if="!keysOf(system).length" class="text-sm text-slate-500 mt-3">
                {{ t('eshop.fetch.keys.none') }}
              </div>
              <div
                v-for="key in keysOf(system)"
                :key="key.clientId"
                class="border border-slate-200 rounded-lg p-3 mt-3 min-w-0"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="font-semibold break-words">{{ keyLabel(key) }}</div>
                    <div class="text-xs text-slate-500 font-mono break-all">
                      {{ key.clientIdMasked }}
                      <span v-if="key.secretLast4">
                        · {{ t('eshop.fetch.keys.secretEnding', { last4: key.secretLast4 }) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <VaButton
                      preset="secondary"
                      size="small"
                      icon="mso-network_check"
                      :loading="keyBusy[keyRef(system, key.clientId)] === 'test'"
                      :disabled="!!keyBusy[keyRef(system, key.clientId)] || (system === 'live' && liveOffHere)"
                      @click="testKey(system, key)"
                    >
                      {{ t('eshop.fetch.keys.test') }}
                    </VaButton>
                    <VaButton
                      preset="secondary"
                      size="small"
                      color="danger"
                      icon="mso-delete"
                      :loading="keyBusy[keyRef(system, key.clientId)] === 'remove'"
                      :disabled="!!keyBusy[keyRef(system, key.clientId)]"
                      :aria-label="t('eshop.common.remove')"
                      @click="removeKey(system, key)"
                    />
                  </div>
                </div>
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2 text-sm">
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-500">{{ t('eshop.fetch.keys.saved') }}</dt>
                    <dd>
                      {{ formatDateTime(key.savedAt) || '—' }}
                      <span v-if="key.savedBy" class="text-slate-500 break-all">
                        {{ t('eshop.fetch.keys.savedBy', { name: key.savedBy }) }}
                      </span>
                    </dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-500">{{ t('eshop.fetch.keys.lastTest') }}</dt>
                    <dd class="flex items-center gap-2 flex-wrap">
                      <template v-if="key.lastTestAt">
                        <VaBadge
                          :text="key.lastTestOk ? t('eshop.fetch.keys.testOk') : t('eshop.fetch.keys.testFailed')"
                          :color="key.lastTestOk ? 'success' : 'danger'"
                        />
                        <span>{{ formatDateTime(key.lastTestAt) }}</span>
                      </template>
                      <span v-else>{{ t('eshop.common.never') }}</span>
                    </dd>
                  </div>
                </dl>
                <div
                  v-if="key.lastTestAt && key.lastTestMessage"
                  class="text-xs mt-2 break-words"
                  :class="key.lastTestOk ? 'text-success' : 'text-danger'"
                >
                  {{ key.lastTestMessage }}
                </div>
                <div v-if="key.storesSeen.length" class="text-xs text-slate-600 mt-1 break-words">
                  {{ t('eshop.fetch.keys.storesSeen', { list: key.storesSeen.map((s) => storeLabel(s)).join(', ') }) }}
                </div>
                <div v-else class="text-xs text-slate-500 mt-1">{{ t('eshop.fetch.keys.storesNone') }}</div>
              </div>

              <form class="flex flex-col gap-3 mt-4" autocomplete="off" @submit.prevent="saveKey(system)">
                <h4 class="font-semibold text-xs text-slate-600">{{ t('eshop.fetch.keys.addTitle') }}</h4>
                <VaInput
                  v-model="keyInputs[system].label"
                  maxlength="120"
                  autocomplete="off"
                  :label="t('eshop.fetch.keys.label')"
                  :placeholder="t('eshop.fetch.keys.labelPlaceholder')"
                />
                <VaInput
                  v-model="keyInputs[system].clientId"
                  maxlength="200"
                  autocomplete="off"
                  :label="t('eshop.fetch.keys.clientId')"
                />
                <VaInput
                  v-model="keyInputs[system].clientSecret"
                  type="password"
                  maxlength="500"
                  autocomplete="new-password"
                  :label="t('eshop.fetch.keys.clientSecret')"
                />
                <div class="flex items-center gap-2 flex-wrap">
                  <VaButton
                    type="submit"
                    size="small"
                    icon="save"
                    :loading="keySaving[system]"
                    :disabled="keySaving[system] || !canSaveKey(system) || (system === 'live' && liveOffHere)"
                  >
                    {{ t('eshop.fetch.keys.save') }}
                  </VaButton>
                </div>
                <p class="va-text-secondary text-xs">{{ t('eshop.fetch.keys.inputHelp') }}</p>
                <div
                  v-if="keyNotes[system]"
                  class="text-sm break-words"
                  :class="keyNotes[system]?.ok ? 'text-success' : 'text-danger'"
                >
                  {{ keyNotes[system]?.text }}
                </div>
              </form>
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- What is sent -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.fetch.feed.title') }}</h2>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.fetch.feed.help') }}</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
            <div>
              <VaSwitch v-model="form.enabled" :label="t('eshop.fetch.feed.enabled')" left-label size="small" />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.fetch.feed.enabledHelp') }}</div>
            </div>
            <div>
              <VaSwitch v-model="form.stockSync" :label="t('eshop.fetch.feed.stock')" left-label size="small" />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.fetch.feed.stockHelp') }}</div>
            </div>
            <div>
              <VaSwitch v-model="form.priceSync" :label="t('eshop.fetch.feed.prices')" left-label size="small" />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.fetch.feed.pricesHelp') }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <VaInput
              v-model="form.stockBuffer"
              type="number"
              inputmode="numeric"
              :label="t('eshop.fetch.feed.stockBuffer')"
              :messages="t('eshop.fetch.feed.stockBufferHelp')"
            />
            <VaSelect
              v-model="form.unlimitedMode"
              :options="unlimitedOptions"
              value-by="value"
              text-by="text"
              :label="t('eshop.fetch.feed.unlimited')"
              :messages="t('eshop.fetch.feed.unlimitedHelp')"
            />
            <VaInput
              v-if="form.unlimitedMode === 'send'"
              v-model="form.unlimitedCount"
              type="number"
              inputmode="numeric"
              :label="t('eshop.fetch.feed.unlimitedCount')"
              :messages="t('eshop.fetch.feed.unlimitedCountHelp')"
            />
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Fetch stores linked to POW shops -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.fetch.stores.title') }}</h2>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.fetch.stores.help', { n: MAX_STORES }) }}</p>
          <div v-if="!shops.length" class="text-sm text-danger mt-3">{{ t('eshop.fetch.stores.noShops') }}</div>

          <div class="flex flex-col gap-3 mt-4">
            <div v-for="link in form.stores" :key="link.storeId" class="border border-slate-200 rounded-lg p-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-semibold break-words">{{ link.name || link.storeId }}</div>
                  <div v-if="link.name" class="text-xs text-slate-500 font-mono break-all">{{ link.storeId }}</div>
                  <div v-if="notInMode(link)" class="text-xs text-warning mt-1">
                    {{ t('eshop.fetch.stores.notInMode', { mode: environmentName(form.environment) }) }}
                  </div>
                </div>
                <VaButton
                  preset="secondary"
                  size="small"
                  icon="mso-delete"
                  color="danger"
                  class="shrink-0"
                  :aria-label="t('eshop.common.remove')"
                  @click="removeStore(link.storeId)"
                />
              </div>
              <div class="flex items-end gap-4 flex-wrap mt-2">
                <div class="w-full sm:w-72">
                  <VaSelect
                    v-model="link.zoneId"
                    :options="shopOptionsFor(link)"
                    value-by="value"
                    text-by="text"
                    :label="t('eshop.fetch.stores.shop')"
                    :placeholder="t('eshop.fetch.stores.shopPlaceholder')"
                    :no-options-text="t('eshop.fetch.stores.noShops')"
                  />
                </div>
                <VaSwitch
                  v-model="link.active"
                  :label="t('eshop.fetch.stores.active')"
                  left-label
                  size="small"
                  class="mb-2"
                />
              </div>
              <div v-if="link.active && !link.zoneId" class="text-xs text-danger mt-1">
                {{ t('eshop.fetch.stores.chooseShop') }}
              </div>
            </div>
            <div v-if="!form.stores.length" class="text-sm text-slate-500">{{ t('eshop.fetch.stores.empty') }}</div>
          </div>

          <h3 class="font-semibold text-sm mt-6">{{ t('eshop.fetch.stores.addTitle') }}</h3>
          <div class="flex items-end gap-2 flex-wrap mt-2">
            <div class="w-full sm:w-80">
              <VaSelect
                v-model="storeToAdd"
                :options="addOptions"
                value-by="value"
                text-by="text"
                :label="t('eshop.fetch.stores.addLabel')"
                :placeholder="t('eshop.fetch.stores.addPlaceholder')"
                :no-options-text="t('eshop.fetch.stores.noneToAdd')"
              />
            </div>
            <VaButton
              size="small"
              icon="add"
              :disabled="!storeToAdd || form.stores.length >= MAX_STORES"
              @click="addStore"
            >
              {{ t('eshop.fetch.stores.add') }}
            </VaButton>
            <VaButton
              preset="secondary"
              size="small"
              icon="mso-cloud_download"
              :loading="storesLoading"
              @click="loadStores"
            >
              {{ t('eshop.fetch.stores.load') }}
            </VaButton>
          </div>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.fetch.stores.addHelp') }}</p>
          <div
            v-if="storeListLine"
            class="text-xs mt-1 break-words"
            :class="storeListLine.ok ? 'text-slate-600' : 'text-danger'"
          >
            {{ storeListLine.text }}
          </div>
          <ul v-if="storeList && storeList.keys.length" class="text-xs mt-1 list-disc pl-5">
            <li
              v-for="(k, i) in storeList.keys"
              :key="k.clientId || i"
              class="break-words"
              :class="k.ok ? 'text-slate-600' : 'text-danger'"
            >
              {{
                k.ok
                  ? t('eshop.fetch.stores.keyLine', { label: k.label || k.clientIdMasked, n: k.stores })
                  : t('eshop.fetch.stores.keyFailed', { label: k.label || k.clientIdMasked, message: k.message })
              }}
            </li>
          </ul>
          <div v-if="modeNotSaved && saved" class="text-xs text-warning mt-1">
            {{
              t('eshop.fetch.stores.loadSavedMode', {
                saved: environmentName(saved.environment),
                mode: environmentName(form.environment),
              })
            }}
          </div>
        </VaCardContent>
      </VaCard>

      <div class="flex justify-end items-center gap-2 flex-wrap">
        <VaBadge v-if="dirty" :text="t('eshop.fetch.unsaved')" color="warning" />
        <VaButton icon="save" :loading="saving" :disabled="loading" @click="save">
          {{ t('eshop.fetch.save') }}
        </VaButton>
      </div>

      <!-- Status of the saved stores, and runs on demand -->
      <VaCard v-if="saved">
        <VaCardContent>
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="flex-1 min-w-[16rem]">
              <h2 class="va-h6">{{ t('eshop.fetch.status.title') }}</h2>
              <p class="va-text-secondary text-xs mt-1">
                {{ t('eshop.fetch.status.help', { mode: environmentName(saved.environment) }) }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <VaButton
                preset="secondary"
                size="small"
                icon="mso-sync"
                :loading="runBusy === 'listings'"
                :disabled="!!runBusy"
                @click="run('listings')"
              >
                {{ t('eshop.fetch.status.readListings') }}
              </VaButton>
              <VaButton
                size="small"
                icon="mso-inventory_2"
                :loading="runBusy === 'stock'"
                :disabled="!!runBusy"
                @click="run('stock')"
              >
                {{ t('eshop.fetch.status.sendStock') }}
              </VaButton>
              <VaButton
                preset="secondary"
                size="small"
                icon="mso-sell"
                :loading="runBusy === 'prices'"
                :disabled="!!runBusy"
                @click="run('prices')"
              >
                {{ t('eshop.fetch.status.sendPrices') }}
              </VaButton>
            </div>
          </div>
          <p v-if="dirty" class="text-xs text-warning mt-2">{{ t('eshop.fetch.status.unsavedNote') }}</p>

          <VaAlert v-if="runAnswer" :color="runAnswer.color" border="left" class="mt-3">
            <div class="font-semibold mb-1">
              {{ t('eshop.fetch.status.answerTitle', { what: runAnswer.title, when: formatDateTime(runAnswer.at) }) }}
            </div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(line, i) in runAnswer.lines" :key="i" class="break-words">{{ line }}</li>
            </ul>
          </VaAlert>

          <div v-if="!statusRows.length" class="text-sm text-slate-500 mt-3">
            {{ t('eshop.fetch.status.noStores') }}
          </div>
          <div v-for="row in statusRows" :key="row.link.storeId" class="border border-slate-200 rounded-lg p-3 mt-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold break-all">{{ storeLabel(row.link) }}</span>
              <VaBadge
                :text="row.link.active ? t('eshop.fetch.status.active') : t('eshop.fetch.status.paused')"
                :color="row.link.active ? 'success' : 'secondary'"
              />
            </div>
            <div class="text-xs text-slate-500 mt-1">
              {{
                shopName(row.link.zoneId)
                  ? t('eshop.fetch.status.sellsFrom', { shop: shopName(row.link.zoneId) })
                  : t('eshop.fetch.status.noShop')
              }}
            </div>
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-2 text-sm">
              <div class="min-w-0">
                <dt class="text-xs text-slate-500">{{ t('eshop.fetch.status.listings') }}</dt>
                <dd>{{ listingsStateText(row.state) }}</dd>
              </div>
              <div class="min-w-0">
                <dt class="text-xs text-slate-500">{{ t('eshop.fetch.status.lastStock') }}</dt>
                <dd class="break-words">{{ runStateText(row.state?.lastStockAt, row.state?.lastStockSummary) }}</dd>
              </div>
              <div class="min-w-0">
                <dt class="text-xs text-slate-500">{{ t('eshop.fetch.status.lastPrices') }}</dt>
                <dd class="break-words">{{ runStateText(row.state?.lastPriceAt, row.state?.lastPriceSummary) }}</dd>
              </div>
              <div class="min-w-0">
                <dt class="text-xs text-slate-500">{{ t('eshop.fetch.status.lastError') }}</dt>
                <dd v-if="row.state?.lastError" class="text-danger break-words">
                  {{ formatDateTime(row.state.lastErrorAt) || '—' }} — {{ row.state.lastError }}
                </dd>
                <dd v-else>—</dd>
              </div>
            </dl>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Listings: what a saved store lists on Fetch and what was last sent -->
      <VaCard v-if="saved">
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.fetch.listings.title') }}</h2>
          <p class="va-text-secondary text-xs mt-1">
            {{ t('eshop.fetch.listings.help', { mode: environmentName(saved.environment) }) }}
          </p>
          <div v-if="!listStoreOptions.length" class="text-sm text-slate-500 mt-3">
            {{ t('eshop.fetch.listings.noStores') }}
          </div>
          <template v-else>
            <div class="flex items-end gap-4 flex-wrap mt-3">
              <div class="w-full sm:w-72">
                <VaSelect
                  v-model="listStore"
                  :options="listStoreOptions"
                  value-by="value"
                  text-by="text"
                  :label="t('eshop.fetch.listings.store')"
                />
              </div>
              <div class="w-full sm:w-52">
                <VaSelect
                  v-model="listMatched"
                  :options="matchedOptions"
                  value-by="value"
                  text-by="text"
                  :label="t('eshop.fetch.listings.show')"
                />
              </div>
              <div class="w-full sm:w-72">
                <VaInput
                  v-model="listSearch"
                  maxlength="60"
                  clearable
                  :label="t('eshop.fetch.listings.search')"
                  :placeholder="t('eshop.fetch.listings.searchPlaceholder')"
                />
              </div>
            </div>

            <VaAlert v-if="listError" color="danger" border="left" class="mt-3">{{ listError }}</VaAlert>

            <div class="overflow-x-auto mt-3">
              <VaDataTable
                :columns="listColumns"
                :items="listRows"
                :loading="listLoading"
                :style="{
                  '--va-data-table-thead-background': 'var(--va-background-element)',
                  '--va-data-table-thead-color': '#2C82E0',
                }"
              >
                <template #cell(name)="{ rowData }">
                  <div class="font-semibold min-w-[10rem] whitespace-normal">{{ rowData.name || '—' }}</div>
                  <div v-if="rowData.isActive === false" class="text-xs text-warning">
                    {{ t('eshop.fetch.listings.inactive') }}
                  </div>
                </template>
                <template #cell(barcode)="{ rowData }">
                  <span class="font-mono text-xs">{{ rowData.barcode || '—' }}</span>
                  <div v-if="rowData.ref" class="text-xs text-slate-500">
                    {{ t('eshop.fetch.listings.ref', { ref: rowData.ref }) }}
                  </div>
                </template>
                <template #cell(articleCode)="{ rowData }">
                  <template v-if="rowData.articleCode">
                    <span class="font-mono text-xs">{{ rowData.articleCode }}</span>
                    <div v-if="matchedByText(rowData.matchedBy)" class="text-xs text-slate-500">
                      {{ matchedByText(rowData.matchedBy) }}
                    </div>
                  </template>
                  <span v-else class="text-xs text-slate-400">{{ t('eshop.fetch.listings.notOurs') }}</span>
                </template>
                <template #cell(fetchStockCount)="{ rowData }">
                  <div class="text-right">{{ formatNumber(rowData.fetchStockCount) || '—' }}</div>
                </template>
                <template #cell(pushedStock)="{ rowData }">
                  <div class="text-right">{{ formatNumber(rowData.pushedStock) || '—' }}</div>
                  <div v-if="rowData.pushedStockAt" class="text-right text-xs text-slate-500">
                    {{ formatDateTime(rowData.pushedStockAt) }}
                  </div>
                </template>
                <template #cell(fetchPrice)="{ rowData }">
                  <div class="text-right">{{ formatPrice(rowData.fetchPrice) || '—' }}</div>
                </template>
                <template #cell(pushedPrice)="{ rowData }">
                  <div class="text-right">{{ formatPrice(rowData.pushedPrice) || '—' }}</div>
                  <div v-if="rowData.pushedPriceAt" class="text-right text-xs text-slate-500">
                    {{ formatDateTime(rowData.pushedPriceAt) }}
                  </div>
                </template>
                <template #cell(lastError)="{ rowData }">
                  <template v-if="rowData.lastError">
                    <div class="text-xs text-danger min-w-[8rem] whitespace-normal break-words">
                      {{ rowData.lastError }}
                    </div>
                    <div v-if="rowData.lastErrorAt" class="text-xs text-slate-500">
                      {{ formatDateTime(rowData.lastErrorAt) }}
                    </div>
                  </template>
                  <span v-else class="text-slate-400">—</span>
                </template>
                <template #bodyAppend>
                  <tr v-if="!listLoading && !listRows.length && !listError">
                    <td :colspan="listColumns.length" class="text-center text-slate-500 py-4">
                      {{ listEmptyText }}
                    </td>
                  </tr>
                </template>
              </VaDataTable>
            </div>

            <div class="flex items-center justify-between gap-3 flex-wrap mt-4">
              <span class="text-xs text-slate-500">{{ t('eshop.fetch.listings.total', { n: listTotal }) }}</span>
              <VaPagination
                v-if="listPages > 1"
                v-model="listPage"
                :pages="listPages"
                :visible-pages="5"
                buttons-preset="secondary"
              />
            </div>
          </template>
        </VaCardContent>
      </VaCard>
    </template>
  </div>
</template>
