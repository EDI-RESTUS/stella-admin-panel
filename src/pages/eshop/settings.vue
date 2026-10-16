<script setup lang="ts">
// E-shop settings of the navbar outlet (outlet.eshopFulfilment — POW only).
// GET /eshop/settings/:outletId loads them (defaults when the outlet has none)
// with their problems, the outlet's zones and the Cyprus districts; Save PUTs
// the WHOLE settings object: the loaded one with the edited keys replaced, so
// whatever this page does not show (a later phase's courier booking fields …)
// goes back unchanged (eshopHelpers.settingsPayloadFromForm). Checkout mode and
// order splitting are shown but not editable yet (later phases): saved as
// loaded. Couriers: ACS and BOX NOW on/off, the fee table each is priced with,
// the districts ACS does not serve and BOX NOW's heaviest parcel (kg here,
// grams stored); a server without a couriers block gets none back.
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useToast, useModal, defineVaDataTableColumns } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import {
  CYPRUS_DISTRICTS,
  NO_REGION,
  eshopApiError,
  formFromSettings,
  newShopRow,
  settingsPayloadFromForm,
} from './eshopHelpers'
import type { EshopRegionRow, EshopSettingsForm, EshopShopRow } from './eshopHelpers'

type Zone = {
  _id: string
  name: string
  serviceZoneId: number
  terminalNumber: number
  posSaleDocumentTypeCode: string
  isActive: boolean
}
type Check = { name: string; ok: boolean; detail: string }

const { t } = useI18n()
const { init } = useToast()
const { confirm } = useModal()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop, isSuperAdmin } = useEshopOutlet()

// A super-admin may write the first settings of any outlet; an admin only
// edits an outlet that has an e-shop already.
const canUse = computed(() => isSuperAdmin.value || hasEshop.value)

const loading = ref(false)
const saving = ref(false)
const checking = ref(false)
const loadError = ref('')
const configured = ref(false)
const form = ref<EshopSettingsForm | null>(null)
const storedEnabled = ref(false)
const snapshot = ref('')
const problems = ref<string[]>([])
const warnings = ref<string[]>([])
// true while `problems` belong to settings the server refused (not the saved ones).
const problemsRefused = ref(false)
const formErrors = ref<string[]>([])
const zones = ref<Zone[]>([])
const districts = ref<string[]>([...CYPRUS_DISTRICTS])
const checks = ref<Check[] | null>(null)
const checkOk = ref(false)
const checkProblems = ref(0)
const zoneToAdd = ref('')
const regionPick = reactive<Record<number, string>>({})

const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== snapshot.value)

const zoneById = computed(() => {
  const map = new Map<string, Zone>()
  for (const z of zones.value) map.set(String(z._id).toLowerCase(), z)
  return map
})

function zoneName(zoneId: string): string {
  return zoneById.value.get(zoneId)?.name || zoneId
}

/** "MALL OF CYPRUS (zone 7)", with the shop's display name when it has one. */
function shopLabel(zoneId: string): string {
  const row = form.value?.shops.find((s) => s.zoneId === zoneId)
  const zone = zoneById.value.get(zoneId)
  const name = String(row?.displayName || '').trim() || zone?.name || zoneId
  return zone ? t('eshop.settings.shops.zoneLabel', { name, zone: zone.serviceZoneId }) : name
}

function isListedShop(zoneId: string): boolean {
  return !!form.value?.shops.some((s) => s.zoneId === zoneId)
}

function isActiveShop(zoneId: string): boolean {
  return !!form.value?.shops.some((s) => s.zoneId === zoneId && s.active)
}

/** The Winmax till the shop's documents go to: the override, else the zone's terminal number. */
function tillOf(row: EshopShopRow): string {
  const override = Number(row.tillOverride)
  if (Number.isInteger(override) && override > 0) return String(override)
  const zone = zoneById.value.get(row.zoneId)
  return zone && Number(zone.terminalNumber) > 0 ? String(zone.terminalNumber) : ''
}

function hasTillOverride(row: EshopShopRow): boolean {
  const override = Number(row.tillOverride)
  return Number.isInteger(override) && override > 0
}

const shopColumns = computed(() =>
  defineVaDataTableColumns([
    { label: t('eshop.settings.shops.columns.shop'), key: 'shop' },
    { label: t('eshop.settings.shops.columns.till'), key: 'till' },
    { label: t('eshop.settings.shops.columns.docType'), key: 'docType' },
    { label: t('eshop.settings.shops.columns.warehouse'), key: 'warehouseCode' },
    { label: t('eshop.settings.shops.columns.displayName'), key: 'displayName' },
    { label: t('eshop.settings.shops.columns.tillOverride'), key: 'tillOverride' },
    { label: t('eshop.settings.shops.columns.active'), key: 'active', thAlign: 'center' },
    { label: t('eshop.settings.shops.columns.pickup'), key: 'pickupEnabled', thAlign: 'center' },
    { label: '', key: 'actions', thAlign: 'right' },
  ]),
)

/** Live zones of the outlet that are not shops yet. */
const zoneOptions = computed(() => {
  const listed = new Set((form.value?.shops || []).map((s) => s.zoneId))
  return zones.value
    .filter((z) => !listed.has(String(z._id).toLowerCase()))
    .map((z) => ({
      text: t(z.isActive ? 'eshop.settings.shops.zoneOption' : 'eshop.settings.shops.zoneOptionInactive', {
        name: z.name,
        zone: z.serviceZoneId,
      }),
      value: String(z._id).toLowerCase(),
    }))
})

const regionOptions = computed(() => [
  { text: t('eshop.settings.regions.noRegion'), value: NO_REGION },
  ...(form.value?.regions || []).map((g) => ({ text: g.label || g.key, value: g.key })),
])

const priceLevelOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const boxnowSizeOptions = computed(() => [
  { text: t('eshop.settings.couriers.sizeSmall'), value: 1 },
  { text: t('eshop.settings.couriers.sizeMedium'), value: 2 },
  { text: t('eshop.settings.couriers.sizeLarge'), value: 3 },
])
const unitOptions = computed(() => [
  { text: t('eshop.settings.general.unitKg'), value: 'kg' },
  { text: t('eshop.settings.general.unitG'), value: 'g' },
])

function shopOptionsFor(region: EshopRegionRow) {
  const listed = new Set(region.priorityZoneIds)
  return (form.value?.shops || [])
    .filter((s) => !listed.has(s.zoneId))
    .map((s) => ({ text: shopLabel(s.zoneId), value: s.zoneId }))
}

/** ACS's "not served" boxes: the districts, then any other name the server returned (shown, to be unticked). */
const acsDistrictOptions = computed(() => {
  const chosen = form.value?.couriers?.acs.unsupportedDistricts || []
  return [...districts.value, ...chosen.filter((d) => !districts.value.includes(d))]
})

/* ---------------- Loading ---------------- */
function resetPage() {
  form.value = null
  loadError.value = ''
  configured.value = false
  problems.value = []
  warnings.value = []
  problemsRefused.value = false
  formErrors.value = []
  checks.value = null
  zoneToAdd.value = ''
  Object.keys(regionPick).forEach((k) => delete regionPick[Number(k)])
}

function takeSettings(settings: any) {
  form.value = formFromSettings(settings, districts.value)
  storedEnabled.value = form.value.enabled
  snapshot.value = JSON.stringify(form.value)
}

async function load() {
  const id = outletId.value
  if (!id || !canUse.value) return
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await axios.get(`${url}/eshop/settings/${id}`)
    if (id !== outletId.value) return
    const d = data?.data || {}
    if (Array.isArray(d.districts) && d.districts.length) districts.value = d.districts.map(String)
    zones.value = Array.isArray(d.zones) ? d.zones : []
    configured.value = d.configured === true
    problems.value = Array.isArray(d.problems) ? d.problems : []
    warnings.value = Array.isArray(d.warnings) ? d.warnings : []
    problemsRefused.value = false
    formErrors.value = []
    checks.value = null
    takeSettings(d.settings)
  } catch (err: any) {
    if (id !== outletId.value) return
    form.value = null
    loadError.value = eshopApiError(err, t('eshop.settings.toast.loadFailed'), t)
  } finally {
    if (id === outletId.value) loading.value = false
  }
}

async function reload() {
  if (dirty.value) {
    const ok = await confirm({
      title: t('eshop.settings.discardTitle'),
      message: t('eshop.settings.discardMessage'),
      okText: t('eshop.settings.discardOk'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok) return
  }
  load()
}

watch(
  [outletId, canUse],
  () => {
    resetPage()
    load()
  },
  { immediate: true },
)

/* ---------------- Shops ---------------- */
function addShop() {
  const zone = zoneById.value.get(zoneToAdd.value)
  if (!form.value || !zone) return
  // The shops' Winmax codes double as their warehouse codes (4 → 4 …): a starting value to check.
  const code = Number(zone.serviceZoneId)
  form.value.shops.push(newShopRow(String(zone._id).toLowerCase(), Number.isInteger(code) && code > 0 ? code : ''))
  zoneToAdd.value = ''
}

async function removeShop(zoneId: string) {
  if (!form.value) return
  const ok = await confirm({
    title: t('eshop.settings.shops.removeTitle'),
    message: t('eshop.settings.shops.removeMessage', { name: shopLabel(zoneId) }),
    okText: t('eshop.common.remove'),
    cancelText: t('eshop.common.cancel'),
    size: 'medium',
  })
  if (!ok || !form.value) return
  form.value.shops = form.value.shops.filter((s) => s.zoneId !== zoneId)
  // A region may only list the e-shop's shops.
  for (const region of form.value.regions) {
    region.priorityZoneIds = region.priorityZoneIds.filter((id) => id !== zoneId)
  }
}

/* ---------------- Regions ---------------- */
function moveShop(region: EshopRegionRow, index: number, delta: number) {
  const to = index + delta
  if (to < 0 || to >= region.priorityZoneIds.length) return
  const [zoneId] = region.priorityZoneIds.splice(index, 1)
  region.priorityZoneIds.splice(to, 0, zoneId)
}

function removeFromRegion(region: EshopRegionRow, index: number) {
  region.priorityZoneIds.splice(index, 1)
}

function addToRegion(region: EshopRegionRow, regionIndex: number) {
  const zoneId = regionPick[regionIndex]
  if (zoneId && !region.priorityZoneIds.includes(zoneId)) region.priorityZoneIds.push(zoneId)
  regionPick[regionIndex] = ''
}

function addPostcode() {
  form.value?.postcodeRegions.push({ postalCode: '', regionKey: NO_REGION })
}

function removePostcode(index: number) {
  form.value?.postcodeRegions.splice(index, 1)
}

/* ---------------- Save / check ---------------- */
async function save() {
  const id = outletId.value
  if (!form.value || !id) return
  const { payload, errors } = settingsPayloadFromForm(form.value, {
    districts: districts.value,
    shopName: zoneName,
    t,
  })
  formErrors.value = errors
  if (!payload) {
    init({ message: errors[0], color: 'danger' })
    return
  }
  if (payload.enabled !== storedEnabled.value) {
    const ok = await confirm({
      title: payload.enabled ? t('eshop.settings.enableTitle') : t('eshop.settings.disableTitle'),
      message: payload.enabled ? t('eshop.settings.enableMessage') : t('eshop.settings.disableMessage'),
      okText: payload.enabled ? t('eshop.settings.enableOk') : t('eshop.settings.disableOk'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok || id !== outletId.value) return
  }
  saving.value = true
  try {
    const { data } = await axios.put(`${url}/eshop/settings/${id}`, payload)
    if (id !== outletId.value) return
    const d = data?.data || {}
    configured.value = true
    problems.value = Array.isArray(d.problems) ? d.problems : []
    warnings.value = Array.isArray(d.warnings) ? d.warnings : []
    problemsRefused.value = false
    checks.value = null
    takeSettings(d.settings)
    if (problems.value.length) {
      init({ message: t('eshop.settings.toast.savedWithProblems', { n: problems.value.length }), color: 'warning' })
    } else {
      init({ message: t('eshop.settings.toast.saved'), color: 'success' })
    }
  } catch (err: any) {
    const body = err?.response?.data
    if (id === outletId.value && err?.response?.status === 400 && Array.isArray(body?.data?.problems)) {
      problems.value = body.data.problems
      warnings.value = Array.isArray(body.data.warnings) ? body.data.warnings : []
      problemsRefused.value = true
    }
    init({ message: eshopApiError(err, t('eshop.settings.toast.saveFailed'), t), color: 'danger' })
  } finally {
    saving.value = false
  }
}

async function runCheck() {
  const id = outletId.value
  if (!id) return
  checking.value = true
  try {
    const { data } = await axios.post(`${url}/eshop/settings/${id}/check`)
    if (id !== outletId.value) return
    const d = data?.data || {}
    checks.value = Array.isArray(d.checks) ? d.checks : []
    checkOk.value = d.ok === true
    checkProblems.value = Array.isArray(d.problems) ? d.problems.length : 0
  } catch (err: any) {
    init({ message: eshopApiError(err, t('eshop.settings.toast.checkFailed'), t), color: 'danger' })
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div class="flex-1 min-w-[16rem]">
            <h1 class="va-h5">{{ t('eshop.settings.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.settings.intro') }}</p>
          </div>
          <div v-if="canUse && outletId" class="flex items-center gap-2 flex-wrap">
            <VaBadge v-if="dirty" :text="t('eshop.settings.unsaved')" color="warning" />
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
            <VaButton
              preset="secondary"
              size="small"
              icon="fact_check"
              :loading="checking"
              :disabled="!form || !configured || saving"
              @click="runCheck"
            >
              {{ t('eshop.settings.check') }}
            </VaButton>
            <VaButton size="small" icon="save" :loading="saving" :disabled="!form || loading" @click="save">
              {{ t('eshop.settings.save') }}
            </VaButton>
          </div>
        </div>

        <div v-if="!outletId" class="text-center text-slate-500 py-4">{{ t('eshop.common.selectOutlet') }}</div>
        <div v-else-if="!canUse && !outlet" class="text-center text-slate-500 py-4">
          {{ t('eshop.common.loadingOutlet') }}
        </div>
        <VaAlert v-else-if="!canUse" color="info" border="left">{{ t('eshop.common.noEshop') }}</VaAlert>
        <template v-else>
          <div v-if="loading && !form" class="text-center text-slate-500 py-4">{{ t('eshop.common.loading') }}</div>
          <VaAlert v-if="loadError" color="danger" border="left" class="mb-3">{{ loadError }}</VaAlert>
          <VaAlert v-if="form && !configured" color="info" border="left" class="mb-3">
            {{ t('eshop.settings.notConfigured') }}
          </VaAlert>
          <VaAlert v-if="formErrors.length" color="danger" border="left" class="mb-3">
            <div class="font-semibold mb-1">{{ t('eshop.settings.formErrorsTitle') }}</div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(e, i) in formErrors" :key="i">{{ e }}</li>
            </ul>
          </VaAlert>
          <VaAlert v-if="problems.length" color="danger" border="left" class="mb-3">
            <div class="font-semibold mb-1">
              {{ problemsRefused ? t('eshop.settings.problemsRefusedTitle') : t('eshop.settings.problemsTitle') }}
            </div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(p, i) in problems" :key="i">{{ p }}</li>
            </ul>
          </VaAlert>
          <VaAlert v-if="warnings.length" color="warning" border="left" class="mb-3">
            <div class="font-semibold mb-1">{{ t('eshop.settings.warningsTitle') }}</div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
            </ul>
          </VaAlert>
          <div v-if="form && !problems.length && !warnings.length" class="text-sm text-success">
            {{ t('eshop.settings.noProblems') }}
          </div>
        </template>
      </VaCardContent>
    </VaCard>

    <template v-if="canUse && form">
      <!-- Winmax check of the SAVED settings -->
      <VaCard v-if="checks">
        <VaCardContent>
          <div class="flex items-center justify-between gap-2 flex-wrap mb-1">
            <h2 class="va-h6">{{ t('eshop.settings.checkTitle') }}</h2>
            <VaBadge
              :text="checkOk ? t('eshop.settings.checkAllOk') : t('eshop.settings.checkSomeFailed')"
              :color="checkOk ? 'success' : 'danger'"
            />
          </div>
          <p class="va-text-secondary text-xs mb-2">
            {{ dirty ? t('eshop.settings.checkIntroDirty') : t('eshop.settings.checkIntro') }}
          </p>
          <div v-if="!checks.length" class="text-sm text-slate-500">{{ t('eshop.settings.checkNone') }}</div>
          <div
            v-for="(c, i) in checks"
            :key="i"
            class="flex items-start gap-3 py-1 border-b border-slate-100 last:border-b-0"
          >
            <VaBadge
              :text="c.ok ? t('eshop.settings.checkOk') : t('eshop.settings.checkFail')"
              :color="c.ok ? 'success' : 'danger'"
              class="shrink-0 mt-0.5"
            />
            <div class="min-w-0">
              <div class="font-semibold text-sm">{{ c.name }}</div>
              <div class="text-xs text-slate-600 break-words">{{ c.detail }}</div>
            </div>
          </div>
          <div v-if="checkProblems" class="text-xs text-danger mt-2">
            {{ t('eshop.settings.checkProblems', { n: checkProblems }) }}
          </div>
        </VaCardContent>
      </VaCard>

      <!-- General -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.settings.general.title') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
            <div>
              <VaSwitch v-model="form.enabled" :label="t('eshop.settings.general.enabled')" left-label size="small" />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.settings.general.enabledHelp') }}</div>
            </div>
            <div>
              <VaSwitch
                :model-value="form.checkoutMode === 'on'"
                :label="t('eshop.settings.general.checkout')"
                left-label
                size="small"
                @update:modelValue="(v: boolean) => (form.checkoutMode = v ? 'on' : 'off')"
              />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.settings.general.checkoutHelp') }}</div>
            </div>
            <div>
              <VaSwitch
                v-model="form.allowSplit"
                :label="t('eshop.settings.general.allowSplit')"
                left-label
                size="small"
              />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.settings.general.allowSplitHelp') }}</div>
            </div>
            <div>
              <VaSwitch
                v-model="form.testPayments"
                :label="t('eshop.settings.general.testPayments')"
                color="danger"
                left-label
                size="small"
              />
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.settings.general.testPaymentsHelp') }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <VaInput
              v-model="form.reservationMinutes"
              type="number"
              min="1"
              max="60"
              step="1"
              :label="t('eshop.settings.general.reservationMinutes')"
              :messages="t('eshop.settings.general.reservationMinutesHelp')"
            />
            <VaInput
              v-model="form.tareGrams"
              type="number"
              min="0"
              step="1"
              :label="t('eshop.settings.general.tareGrams')"
              :messages="t('eshop.settings.general.tareGramsHelp')"
            />
            <VaInput
              v-model="form.shippingArticleCode"
              maxlength="40"
              :label="t('eshop.settings.general.shippingArticleCode')"
              :messages="t('eshop.settings.general.shippingArticleCodeHelp')"
            />
          </div>

          <h3 class="font-semibold text-sm mt-6">{{ t('eshop.settings.general.weightTitle') }}</h3>
          <p class="va-text-secondary text-xs">{{ t('eshop.settings.general.weightHelp') }}</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
            <VaSelect
              v-model="form.weight.priceLevel"
              :options="priceLevelOptions"
              :label="t('eshop.settings.general.priceLevel')"
            />
            <VaSelect
              v-model="form.weight.unit"
              :options="unitOptions"
              value-by="value"
              text-by="text"
              :label="t('eshop.settings.general.unit')"
            />
            <div class="self-end pb-2">
              <VaSwitch
                v-model="form.weight.withTaxes"
                :label="t('eshop.settings.general.withTaxes')"
                left-label
                size="small"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <VaTextarea
              v-model="form.nonStockArticleCodes"
              :label="t('eshop.settings.general.nonStockArticleCodes')"
              :messages="t('eshop.settings.general.nonStockArticleCodesHelp')"
              autosize
              :min-rows="1"
              :max-rows="4"
            />
            <VaInput
              v-model="form.alertEmails"
              :label="t('eshop.settings.general.alertEmails')"
              :messages="t('eshop.settings.general.alertEmailsHelp')"
            />
            <VaInput
              v-model="form.alertPhones"
              :label="t('eshop.settings.general.alertPhones')"
              :messages="t('eshop.settings.general.alertPhonesHelp')"
            />
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Shops -->
      <VaCard>
        <VaCardContent>
          <div class="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 class="va-h6">{{ t('eshop.settings.shops.title') }}</h2>
              <p class="va-text-secondary text-xs mt-1">{{ t('eshop.settings.shops.help') }}</p>
            </div>
            <div class="flex items-end gap-2">
              <div class="w-72">
                <VaSelect
                  v-model="zoneToAdd"
                  :options="zoneOptions"
                  value-by="value"
                  text-by="text"
                  :label="t('eshop.settings.shops.addLabel')"
                  :placeholder="t('eshop.settings.shops.addPlaceholder')"
                  :no-options-text="t('eshop.settings.shops.noZoneLeft')"
                />
              </div>
              <VaButton size="small" icon="add" :disabled="!zoneToAdd" @click="addShop">
                {{ t('eshop.settings.shops.add') }}
              </VaButton>
            </div>
          </div>

          <VaDataTable
            class="mt-3"
            :columns="shopColumns"
            :items="form.shops"
            :style="{
              '--va-data-table-thead-background': 'var(--va-background-element)',
              '--va-data-table-thead-color': '#2C82E0',
            }"
          >
            <template #cell(shop)="{ rowData }">
              <div class="font-semibold">{{ zoneName(rowData.zoneId) }}</div>
              <div v-if="zoneById.get(rowData.zoneId)" class="text-xs text-slate-500">
                {{ t('eshop.settings.shops.zoneShort', { zone: zoneById.get(rowData.zoneId)?.serviceZoneId }) }}
                <span v-if="zoneById.get(rowData.zoneId)?.isActive === false">
                  · {{ t('eshop.settings.shops.zoneInactive') }}
                </span>
              </div>
              <div v-else class="text-xs text-danger">{{ t('eshop.settings.shops.zoneMissing') }}</div>
            </template>

            <template #cell(till)="{ rowData }">
              <span :class="{ 'text-danger': !tillOf(rowData) && rowData.active }">{{ tillOf(rowData) || '—' }}</span>
              <div v-if="hasTillOverride(rowData)" class="text-xs text-slate-500">
                {{ t('eshop.settings.shops.overridden') }}
              </div>
            </template>

            <template #cell(docType)="{ rowData }">
              <span
                :class="{ 'text-danger': !zoneById.get(rowData.zoneId)?.posSaleDocumentTypeCode && rowData.active }"
              >
                {{ zoneById.get(rowData.zoneId)?.posSaleDocumentTypeCode || '—' }}
              </span>
            </template>

            <template #cell(warehouseCode)="{ rowData }">
              <div class="w-24">
                <VaInput v-model="rowData.warehouseCode" type="number" min="1" step="1" />
              </div>
            </template>

            <template #cell(displayName)="{ rowData }">
              <div class="w-48">
                <VaInput v-model="rowData.displayName" maxlength="80" :placeholder="zoneName(rowData.zoneId)" />
              </div>
            </template>

            <template #cell(tillOverride)="{ rowData }">
              <div class="w-24">
                <VaInput v-model="rowData.tillOverride" type="number" min="0" step="1" />
              </div>
            </template>

            <template #cell(active)="{ rowData }">
              <div class="flex justify-center">
                <VaSwitch v-model="rowData.active" size="small" />
              </div>
            </template>

            <template #cell(pickupEnabled)="{ rowData }">
              <div class="flex justify-center">
                <VaSwitch v-model="rowData.pickupEnabled" size="small" />
              </div>
            </template>

            <template #cell(actions)="{ rowData }">
              <div class="flex justify-end">
                <VaButton
                  preset="secondary"
                  size="small"
                  icon="mso-delete"
                  color="danger"
                  :aria-label="t('eshop.common.remove')"
                  @click="removeShop(rowData.zoneId)"
                />
              </div>
            </template>

            <template #bodyAppend>
              <tr v-if="!form.shops.length">
                <td :colspan="shopColumns.length" class="text-center text-slate-500 py-4">
                  {{ t('eshop.settings.shops.empty') }}
                </td>
              </tr>
            </template>
          </VaDataTable>
          <p class="va-text-secondary text-xs mt-2">{{ t('eshop.settings.shops.tillHelp') }}</p>
        </VaCardContent>
      </VaCard>

      <!-- Regions, districts, postcodes -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.settings.regions.title') }}</h2>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.settings.regions.help') }}</p>

          <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            <div v-for="(region, ri) in form.regions" :key="ri" class="border border-slate-200 rounded-lg p-3">
              <div class="flex items-end gap-2">
                <VaInput
                  v-model="region.label"
                  maxlength="60"
                  :label="t('eshop.settings.regions.label')"
                  class="flex-1"
                />
                <VaBadge :text="region.key" color="secondary" class="mb-2" />
              </div>

              <ol class="mt-3 flex flex-col gap-1">
                <li
                  v-for="(zoneId, i) in region.priorityZoneIds"
                  :key="`${zoneId}-${i}`"
                  class="flex items-center gap-1 text-sm"
                >
                  <span class="w-6 text-right text-slate-500 shrink-0">{{ i + 1 }}.</span>
                  <span
                    class="flex-1 min-w-0 truncate"
                    :class="{
                      'text-danger': !isListedShop(zoneId),
                      'text-slate-400': isListedShop(zoneId) && !isActiveShop(zoneId),
                    }"
                  >
                    {{ shopLabel(zoneId) }}
                    <span v-if="!isListedShop(zoneId)" class="text-xs">
                      ({{ t('eshop.settings.regions.notAShop') }})
                    </span>
                    <span v-else-if="!isActiveShop(zoneId)" class="text-xs">
                      ({{ t('eshop.settings.regions.inactive') }})
                    </span>
                  </span>
                  <VaButton
                    preset="plain"
                    size="small"
                    icon="arrow_upward"
                    :aria-label="t('eshop.settings.regions.moveUp')"
                    :disabled="i === 0"
                    @click="moveShop(region, i, -1)"
                  />
                  <VaButton
                    preset="plain"
                    size="small"
                    icon="arrow_downward"
                    :aria-label="t('eshop.settings.regions.moveDown')"
                    :disabled="i === region.priorityZoneIds.length - 1"
                    @click="moveShop(region, i, 1)"
                  />
                  <VaButton
                    preset="plain"
                    size="small"
                    icon="close"
                    color="danger"
                    :aria-label="t('eshop.common.remove')"
                    @click="removeFromRegion(region, i)"
                  />
                </li>
                <li v-if="!region.priorityZoneIds.length" class="text-xs text-danger">
                  {{ t('eshop.settings.regions.noShops') }}
                </li>
              </ol>

              <div class="flex items-end gap-2 mt-3">
                <VaSelect
                  v-model="regionPick[ri]"
                  :options="shopOptionsFor(region)"
                  value-by="value"
                  text-by="text"
                  :placeholder="t('eshop.settings.regions.addShop')"
                  :no-options-text="t('eshop.settings.regions.allListed')"
                  class="flex-1"
                />
                <VaButton
                  preset="secondary"
                  size="small"
                  icon="add"
                  :aria-label="t('eshop.settings.regions.addShop')"
                  :disabled="!regionPick[ri]"
                  @click="addToRegion(region, ri)"
                />
              </div>
            </div>
          </div>

          <h3 class="font-semibold text-sm mt-6">{{ t('eshop.settings.districts.title') }}</h3>
          <p class="va-text-secondary text-xs">{{ t('eshop.settings.districts.help') }}</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <VaSelect
              v-for="d in districts"
              :key="d"
              v-model="form.districtRegions[d]"
              :label="d"
              :options="regionOptions"
              value-by="value"
              text-by="text"
            />
          </div>

          <h3 class="font-semibold text-sm mt-6">{{ t('eshop.settings.postcodes.title') }}</h3>
          <p class="va-text-secondary text-xs">{{ t('eshop.settings.postcodes.help') }}</p>
          <div class="flex flex-col gap-2 mt-2">
            <div v-for="(row, pi) in form.postcodeRegions" :key="pi" class="flex items-end gap-2 flex-wrap">
              <div class="w-32">
                <VaInput
                  v-model="row.postalCode"
                  maxlength="4"
                  inputmode="numeric"
                  :label="t('eshop.settings.postcodes.postcode')"
                />
              </div>
              <div class="w-64">
                <VaSelect
                  v-model="row.regionKey"
                  :options="regionOptions"
                  value-by="value"
                  text-by="text"
                  :label="t('eshop.settings.postcodes.region')"
                />
              </div>
              <VaButton
                preset="secondary"
                size="small"
                icon="mso-delete"
                color="danger"
                class="mb-1"
                :aria-label="t('eshop.common.remove')"
                @click="removePostcode(pi)"
              />
            </div>
            <div v-if="!form.postcodeRegions.length" class="text-xs text-slate-500">
              {{ t('eshop.settings.postcodes.empty') }}
            </div>
            <div>
              <VaButton preset="secondary" size="small" icon="add" @click="addPostcode">
                {{ t('eshop.settings.postcodes.add') }}
              </VaButton>
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Couriers: ACS door to door and BOX NOW lockers; their prices are the fee tables (E-shop › Courier fees) -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.settings.couriers.title') }}</h2>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.settings.couriers.help') }}</p>
          <div v-if="!form.couriers" class="text-sm text-slate-500 mt-3">
            {{ t('eshop.settings.couriers.notOnServer') }}
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div class="border border-slate-200 rounded-lg p-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <h3 class="font-semibold text-sm">{{ t('eshop.settings.couriers.acsTitle') }}</h3>
                <VaSwitch
                  v-model="form.couriers.acs.enabled"
                  :label="t('eshop.settings.couriers.acsEnabled')"
                  left-label
                  size="small"
                />
              </div>
              <VaInput
                v-model="form.couriers.acs.service"
                maxlength="20"
                class="mt-3"
                :label="t('eshop.settings.couriers.acsService')"
                :messages="t('eshop.settings.couriers.acsServiceHelp')"
              />
              <div class="text-sm font-semibold mt-4">{{ t('eshop.settings.couriers.unsupported') }}</div>
              <div class="flex flex-wrap gap-x-5 gap-y-2 mt-2">
                <VaCheckbox
                  v-for="d in acsDistrictOptions"
                  :key="d"
                  v-model="form.couriers.acs.unsupportedDistricts"
                  :array-value="d"
                  :label="d"
                />
              </div>
              <div class="va-text-secondary text-xs mt-1">{{ t('eshop.settings.couriers.unsupportedHelp') }}</div>
            </div>
            <div class="border border-slate-200 rounded-lg p-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <h3 class="font-semibold text-sm">{{ t('eshop.settings.couriers.boxnowTitle') }}</h3>
                <VaSwitch
                  v-model="form.couriers.boxnow.enabled"
                  :label="t('eshop.settings.couriers.boxnowEnabled')"
                  left-label
                  size="small"
                />
              </div>
              <VaInput
                v-model="form.couriers.boxnow.service"
                maxlength="20"
                class="mt-3"
                :label="t('eshop.settings.couriers.boxnowService')"
                :messages="t('eshop.settings.couriers.boxnowServiceHelp')"
              />
              <VaInput
                v-model="form.couriers.boxnow.maxKg"
                inputmode="decimal"
                class="mt-3"
                :label="t('eshop.settings.couriers.maxKg')"
                :messages="t('eshop.settings.couriers.maxKgHelp')"
              />
              <VaInput
                v-model="form.couriers.boxnow.maxValue"
                inputmode="decimal"
                class="mt-3"
                :label="t('eshop.settings.couriers.maxValue')"
                :messages="t('eshop.settings.couriers.maxValueHelp')"
              />
              <VaSelect
                v-model="form.couriers.boxnow.compartmentSize"
                :options="boxnowSizeOptions"
                value-by="value"
                text-by="text"
                class="mt-3"
                :label="t('eshop.settings.couriers.size')"
                :messages="t('eshop.settings.couriers.sizeHelp')"
              />
              <VaInput
                v-model="form.couriers.boxnow.anyApmOriginId"
                maxlength="40"
                class="mt-3"
                :label="t('eshop.settings.couriers.origin')"
                :messages="t('eshop.settings.couriers.originHelp')"
              />
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <div class="flex justify-end gap-2 mb-4">
        <VaBadge v-if="dirty" :text="t('eshop.settings.unsaved')" color="warning" class="self-center" />
        <VaButton icon="save" :loading="saving" :disabled="loading" @click="save">
          {{ t('eshop.settings.save') }}
        </VaButton>
      </div>
    </template>
  </div>
</template>
