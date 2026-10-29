<script setup lang="ts">
// Courier fee tables of the navbar outlet's e-shop (GET /eshop/rates/
// :outletId): per courier, weight bands with what the customer pays and,
// optionally, what the courier charges POW, a price per started kg above the
// last band, and the heaviest parcel taken. Admins save a table whole (PUT
// …/:provider/:service; the server checks it again and keeps the previous
// one in its history) and may fill the ACS table with ACS's public 2026 list
// (POST …/acs/D2D/prefill). Every staff role can price a weight against the
// SAVED tables (POST …/preview). Weights are typed in kg, stored in grams.
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useToast, useModal } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import {
  RATE_TABLES,
  eshopApiError,
  formatDateTime,
  formatPrice,
  gramsToKgText,
  kgTextToGrams,
  priceResultText,
  providerText,
  rateFormFromTable,
  ratePayloadFromForm,
} from './eshopHelpers'
import type { RateForm } from './eshopHelpers'

type Provider = 'acs' | 'boxnow'
type TableState = {
  service: string
  /** The table as the server has it; null: none yet. */
  stored: any | null
  form: RateForm
  snapshot: string
  /** What the page found wrong before sending. */
  errors: string[]
  /** What the server refused. */
  refused: string[]
  saving: boolean
}

const { t } = useI18n()
const { init } = useToast()
const { confirm } = useModal()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop, isAdmin } = useEshopOutlet()

const blankBand = () => ({ upToKg: '', customer: '', cost: '' })
const stateOf = (service: string): TableState => ({
  service,
  stored: null,
  form: rateFormFromTable(null),
  snapshot: '',
  errors: [],
  refused: [],
  saving: false,
})
const tables = reactive<Record<Provider, TableState>>({
  acs: stateOf(RATE_TABLES[0].service),
  boxnow: stateOf(RATE_TABLES[1].service),
})

const loading = ref(false)
const loadError = ref('')
const loaded = ref(false)
const prefilling = ref(false)

function take(provider: Provider, stored: any | null) {
  const s = tables[provider]
  s.stored = stored
  s.form = rateFormFromTable(stored)
  // a first row for an admin to type in, for a table not saved yet
  if (!stored && isAdmin.value && !s.form.bands.length) s.form.bands.push(blankBand())
  s.snapshot = JSON.stringify(s.form)
  s.errors = []
  s.refused = []
}

const isDirty = (provider: Provider) => JSON.stringify(tables[provider].form) !== tables[provider].snapshot

async function load() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await axios.get(`${url}/eshop/rates/${id}`)
    if (id !== outletId.value) return
    const list: any[] = Array.isArray(data?.data?.tables) ? data.data.tables : []
    for (const def of RATE_TABLES) {
      take(def.provider, list.find((x) => x?.provider === def.provider && x?.service === def.service) || null)
    }
    loaded.value = true
  } catch (err: any) {
    if (id !== outletId.value) return
    loaded.value = false
    loadError.value = eshopApiError(err, t('eshop.rates.toast.loadFailed'), t)
  } finally {
    if (id === outletId.value) loading.value = false
  }
}

async function reload() {
  if (RATE_TABLES.some((d) => isDirty(d.provider))) {
    const ok = await confirm({
      title: t('eshop.rates.discardTitle'),
      message: t('eshop.rates.discardMessage'),
      okText: t('eshop.rates.discardOk'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok) return
  }
  load()
}

/** Price a parcel (every staff role): the SAVED tables. */
const preview = reactive({ provider: 'acs' as Provider, kg: '2.4', busy: false, result: null as any, error: '' })

watch(
  [outletId, hasEshop],
  () => {
    loaded.value = false
    loadError.value = ''
    for (const def of RATE_TABLES) take(def.provider, null)
    preview.result = null
    preview.error = ''
    load()
  },
  { immediate: true },
)

/* ---------------- Editing (admins) ---------------- */
function addBand(provider: Provider) {
  tables[provider].form.bands.push(blankBand())
}

function removeBand(provider: Provider, index: number) {
  tables[provider].form.bands.splice(index, 1)
}

function undo(provider: Provider) {
  const s = tables[provider]
  s.form = JSON.parse(s.snapshot)
  s.errors = []
  s.refused = []
}

async function save(provider: Provider) {
  const id = outletId.value
  const s = tables[provider]
  if (!id || !isAdmin.value || s.saving) return
  const { payload, errors } = ratePayloadFromForm(s.form, t)
  s.errors = errors
  s.refused = []
  if (!payload) {
    init({ message: errors[0], color: 'danger' })
    return
  }
  s.saving = true
  try {
    const { data } = await axios.put(`${url}/eshop/rates/${id}/${provider}/${s.service}`, payload)
    if (id !== outletId.value) return
    take(provider, data?.data || null)
    init({
      message: t('eshop.rates.toast.saved', {
        courier: providerText(provider, t),
        version: data?.data?.version ?? '?',
      }),
      color: 'success',
    })
  } catch (err: any) {
    const message = eshopApiError(err, t('eshop.rates.toast.saveFailed'), t)
    const problems = err?.response?.data?.data?.problems
    if (id === outletId.value) {
      s.refused = Array.isArray(problems) && problems.length ? problems.map(String) : [message]
    }
    init({ message, color: 'danger' })
  } finally {
    s.saving = false
  }
}

async function prefillAcs() {
  const id = outletId.value
  if (!id || !isAdmin.value || prefilling.value) return
  const ok = await confirm({
    title: t('eshop.rates.prefillTitle'),
    message: t('eshop.rates.prefillMessage'),
    okText: t('eshop.rates.prefillOk'),
    cancelText: t('eshop.common.cancel'),
    size: 'medium',
  })
  if (!ok || id !== outletId.value) return
  prefilling.value = true
  try {
    const { data } = await axios.post(`${url}/eshop/rates/${id}/acs/D2D/prefill`)
    if (id !== outletId.value) return
    take('acs', data?.data || null)
    init({ message: t('eshop.rates.toast.prefilled', { version: data?.data?.version ?? '?' }), color: 'success' })
  } catch (err: any) {
    init({ message: eshopApiError(err, t('eshop.rates.toast.prefillFailed'), t), color: 'danger' })
  } finally {
    prefilling.value = false
  }
}

/** The settings' courier block on the navbar's outlet document (switch and fee table used), when there. */
function settingsOf(provider: Provider): { enabled: boolean; service: string } | null {
  const c = outlet.value?.eshopFulfilment?.couriers?.[provider]
  if (!c || typeof c !== 'object') return null
  return { enabled: c.enabled === true, service: String(c.service || '').trim() }
}

function sourceText(source: string): string {
  return ['manual', 'acs_public_2026'].includes(source) ? t(`eshop.rates.sources.${source}`) : source || '—'
}

/* ---------------- Price a parcel ---------------- */
const providerOptions = computed(() =>
  RATE_TABLES.map((d) => ({ text: providerText(d.provider, t), value: d.provider })),
)

async function runPreview() {
  const id = outletId.value
  if (!id || preview.busy) return
  const grams = kgTextToGrams(preview.kg)
  if (!(grams >= 1 && grams <= 1000000)) {
    preview.result = null
    preview.error = t('eshop.rates.preview.badWeight')
    return
  }
  preview.busy = true
  preview.error = ''
  try {
    const { data } = await axios.post(`${url}/eshop/rates/${id}/preview`, {
      provider: preview.provider,
      service: tables[preview.provider].service,
      grams,
    })
    if (id !== outletId.value) return
    preview.result = data?.data ? { ...data.data, provider: preview.provider } : null
  } catch (err: any) {
    preview.result = null
    preview.error = eshopApiError(err, t('eshop.rates.toast.previewFailed'), t)
  } finally {
    preview.busy = false
  }
}

const previewText = computed(() => {
  const r = preview.result
  if (!r) return ''
  const kg = gramsToKgText(r.grams)
  if (r.customer?.ok && r.cost?.ok) {
    return t('eshop.rates.preview.result', {
      kg,
      customer: formatPrice(r.customer.amount),
      cost: formatPrice(r.cost.amount),
    })
  }
  return t('eshop.rates.preview.notPriced', {
    kg,
    courier: providerText(r.provider, t),
    reason: priceResultText(r.customer?.ok ? r.cost : r.customer, t),
  })
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div class="flex-1 min-w-[16rem]">
            <h1 class="va-h5">{{ t('eshop.rates.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.rates.intro') }}</p>
          </div>
          <VaButton
            v-if="outletId && hasEshop"
            preset="secondary"
            size="small"
            icon="refresh"
            :loading="loading"
            @click="reload"
          >
            {{ t('eshop.common.refresh') }}
          </VaButton>
        </div>

        <div v-if="!outletId" class="text-center text-slate-500 py-4">{{ t('eshop.common.selectOutlet') }}</div>
        <div v-else-if="!outlet" class="text-center text-slate-500 py-4">{{ t('eshop.common.loadingOutlet') }}</div>
        <VaAlert v-else-if="!hasEshop" color="info" border="left">{{ t('eshop.common.noEshop') }}</VaAlert>
        <template v-else>
          <div v-if="loading && !loaded" class="text-center text-slate-500 py-4">{{ t('eshop.common.loading') }}</div>
          <VaAlert v-if="loadError" color="danger" border="left">{{ loadError }}</VaAlert>
          <div v-if="loaded && !isAdmin" class="text-xs text-slate-500">{{ t('eshop.rates.readOnly') }}</div>
        </template>
      </VaCardContent>
    </VaCard>

    <template v-if="outletId && hasEshop && loaded">
      <!-- Price a parcel: the SAVED tables -->
      <VaCard>
        <VaCardContent>
          <h2 class="va-h6">{{ t('eshop.rates.preview.title') }}</h2>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.rates.preview.help') }}</p>
          <form id="rates-preview" class="flex items-end gap-3 flex-wrap mt-3" @submit.prevent="runPreview">
            <div class="w-40">
              <VaSelect
                v-model="preview.provider"
                :options="providerOptions"
                value-by="value"
                text-by="text"
                :label="t('eshop.rates.preview.courier')"
              />
            </div>
            <div class="w-36">
              <VaInput v-model="preview.kg" inputmode="decimal" :label="t('eshop.rates.preview.weight')" />
            </div>
            <VaButton type="submit" size="small" icon="mso-calculate" :loading="preview.busy">
              {{ t('eshop.rates.preview.run') }}
            </VaButton>
          </form>
          <div v-if="previewText" class="mt-3 text-sm font-semibold">{{ previewText }}</div>
          <div v-if="preview.result?.customer?.band" class="text-xs text-slate-500">
            {{ t('eshop.rates.preview.band', { band: preview.result.customer.band }) }}
          </div>
          <VaAlert v-if="preview.error" color="danger" border="left" class="mt-3">{{ preview.error }}</VaAlert>
        </VaCardContent>
      </VaCard>

      <VaCard v-for="def in RATE_TABLES" :id="`rates-${def.provider}`" :key="def.provider">
        <VaCardContent>
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="min-w-[16rem]">
              <h2 class="va-h6">
                {{ def.provider === 'acs' ? t('eshop.rates.acsTitle') : t('eshop.rates.boxnowTitle') }}
                <span class="text-xs text-slate-500 font-normal">
                  {{ t('eshop.rates.service', { service: tables[def.provider].service }) }}
                </span>
              </h2>
              <div class="text-xs text-slate-500 mt-1">
                <template v-if="tables[def.provider].stored">
                  {{
                    t('eshop.rates.version', {
                      version: tables[def.provider].stored.version ?? '?',
                      when: formatDateTime(tables[def.provider].stored.updatedAt) || '—',
                      by: tables[def.provider].stored.updatedBy || '—',
                    })
                  }}
                  · {{ t('eshop.rates.source', { source: sourceText(tables[def.provider].stored.source) }) }}
                </template>
                <span v-else class="text-warning">{{ t('eshop.rates.noTable') }}</span>
              </div>
              <div v-if="settingsOf(def.provider)" class="text-xs mt-1">
                <span :class="settingsOf(def.provider)?.enabled ? 'text-success' : 'text-slate-500'">
                  {{
                    settingsOf(def.provider)?.enabled
                      ? t('eshop.rates.onInSettings', { courier: providerText(def.provider, t) })
                      : t('eshop.rates.offInSettings', { courier: providerText(def.provider, t) })
                  }}
                </span>
              </div>
              <div
                v-if="settingsOf(def.provider)?.service && settingsOf(def.provider)?.service !== def.service"
                class="text-xs text-danger mt-1"
              >
                {{
                  t('eshop.rates.serviceMismatch', {
                    courier: providerText(def.provider, t),
                    service: settingsOf(def.provider)?.service,
                  })
                }}
              </div>
            </div>
            <div v-if="isAdmin" class="flex items-center gap-2 flex-wrap">
              <VaBadge v-if="isDirty(def.provider)" :text="t('eshop.rates.unsaved')" color="warning" />
              <VaButton
                v-if="def.provider === 'acs'"
                preset="secondary"
                size="small"
                icon="mso-playlist_add"
                :loading="prefilling"
                :disabled="tables.acs.saving"
                @click="prefillAcs"
              >
                {{ t('eshop.rates.prefill') }}
              </VaButton>
              <VaButton
                v-if="isDirty(def.provider)"
                preset="secondary"
                size="small"
                icon="undo"
                :disabled="tables[def.provider].saving"
                @click="undo(def.provider)"
              >
                {{ t('eshop.rates.undo') }}
              </VaButton>
              <VaButton
                size="small"
                icon="save"
                :loading="tables[def.provider].saving"
                :disabled="def.provider === 'acs' && prefilling"
                @click="save(def.provider)"
              >
                {{ t('eshop.rates.save') }}
              </VaButton>
            </div>
          </div>

          <VaAlert v-if="tables[def.provider].errors.length" color="danger" border="left" class="mt-3">
            <div class="font-semibold mb-1">{{ t('eshop.rates.errorsTitle') }}</div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(e, i) in tables[def.provider].errors" :key="i">{{ e }}</li>
            </ul>
          </VaAlert>
          <VaAlert v-if="tables[def.provider].refused.length" color="danger" border="left" class="mt-3">
            <div class="font-semibold mb-1">{{ t('eshop.rates.refusedTitle') }}</div>
            <ul class="list-disc pl-5 text-sm">
              <li v-for="(e, i) in tables[def.provider].refused" :key="i">{{ e }}</li>
            </ul>
          </VaAlert>

          <table class="eshop-rate-bands mt-3 text-sm">
            <thead>
              <tr class="text-left text-xs text-slate-500">
                <th class="pr-3 font-normal">#</th>
                <th class="pr-3 font-normal">{{ t('eshop.rates.columns.upTo') }}</th>
                <th class="pr-3 font-normal">{{ t('eshop.rates.columns.customer') }}</th>
                <th class="pr-3 font-normal">{{ t('eshop.rates.columns.cost') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, i) in tables[def.provider].form.bands" :key="i">
                <td class="pr-3 text-xs text-slate-500">{{ i + 1 }}</td>
                <template v-if="isAdmin">
                  <td class="pr-3 py-1">
                    <VaInput
                      v-model="b.upToKg"
                      class="w-28"
                      inputmode="decimal"
                      :aria-label="t('eshop.rates.bandField.upTo', { n: i + 1 })"
                    />
                  </td>
                  <td class="pr-3 py-1">
                    <VaInput
                      v-model="b.customer"
                      class="w-28"
                      inputmode="decimal"
                      :aria-label="t('eshop.rates.bandField.customer', { n: i + 1 })"
                    />
                  </td>
                  <td class="pr-3 py-1">
                    <VaInput
                      v-model="b.cost"
                      class="w-28"
                      inputmode="decimal"
                      :aria-label="t('eshop.rates.bandField.cost', { n: i + 1 })"
                      :placeholder="t('eshop.rates.costOptional')"
                    />
                  </td>
                  <td>
                    <VaButton
                      preset="plain"
                      size="small"
                      icon="close"
                      color="danger"
                      :aria-label="t('eshop.rates.removeBand')"
                      @click="removeBand(def.provider, i)"
                    />
                  </td>
                </template>
                <template v-else>
                  <td class="pr-3 py-1">{{ b.upToKg }}</td>
                  <td class="pr-3 py-1">{{ b.customer }}</td>
                  <td class="pr-3 py-1">{{ b.cost || '—' }}</td>
                  <td></td>
                </template>
              </tr>
            </tbody>
          </table>
          <div v-if="isAdmin" class="mt-2">
            <VaButton preset="secondary" size="small" icon="add" @click="addBand(def.provider)">
              {{ t('eshop.rates.addBand') }}
            </VaButton>
          </div>

          <h3 class="font-semibold text-sm mt-5">{{ t('eshop.rates.overflowTitle') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <VaInput
              v-model="tables[def.provider].form.perKgCustomer"
              inputmode="decimal"
              :readonly="!isAdmin"
              :label="t('eshop.rates.perKgCustomer')"
            />
            <VaInput
              v-model="tables[def.provider].form.perKgCost"
              inputmode="decimal"
              :readonly="!isAdmin"
              :label="t('eshop.rates.perKgCost')"
              :placeholder="t('eshop.rates.costOptional')"
            />
            <VaInput
              v-model="tables[def.provider].form.maxKg"
              inputmode="decimal"
              :readonly="!isAdmin"
              :label="t('eshop.rates.maxKg')"
            />
          </div>
          <p class="va-text-secondary text-xs mt-2">{{ t('eshop.rates.overflowHelp') }}</p>
        </VaCardContent>
      </VaCard>
    </template>
  </div>
</template>
