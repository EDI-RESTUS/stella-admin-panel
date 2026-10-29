<script setup lang="ts">
// E-shop weights of the navbar outlet: the articles whose shipping weight in
// Winmax is missing or not believable (GET /eshop/reports/:outletId/weights).
// Such an article gets no courier quote until its weight is corrected.
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { defineVaDataTableColumns } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import { eshopApiError, formatNumber, formatPrice, webStatusView, weightReasonText } from './eshopHelpers'

type Counts = { items: number; ok: number; missing: number; invalid: number }

const { t } = useI18n()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop } = useEshopOutlet()

const LIMIT = 50
const status = ref<'missing' | 'invalid'>('missing')
const withStockOnly = ref(false)
const search = ref('')
const page = ref(1)
const loading = ref(false)
const error = ref('')
const counts = ref<Counts | null>(null)
const rows = ref<any[]>([])
const total = ref(0)
const pages = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)))

// Only the answer to the latest request is shown (typing fires several).
let requestSeq = 0

async function load() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  try {
    const { data } = await axios.get(`${url}/eshop/reports/${id}/weights`, {
      params: {
        status: status.value,
        withStockOnly: withStockOnly.value ? '1' : '0',
        q: String(search.value || '').trim(),
        page: page.value,
        limit: LIMIT,
      },
    })
    if (seq !== requestSeq) return
    const d = data?.data || {}
    counts.value = d.counts || null
    rows.value = Array.isArray(d.rows) ? d.rows : []
    total.value = Number(d.total) || 0
  } catch (err: any) {
    if (seq !== requestSeq) return
    counts.value = null
    rows.value = []
    total.value = 0
    error.value = eshopApiError(err, t('eshop.weights.toast.loadFailed'), t)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

/** Back to page 1 (its watcher loads) or, already there, load. */
function reloadFromFirstPage() {
  if (page.value !== 1) page.value = 1
  else load()
}

watch(
  [outletId, hasEshop],
  () => {
    counts.value = null
    rows.value = []
    total.value = 0
    error.value = ''
    reloadFromFirstPage()
  },
  { immediate: true },
)
watch([status, withStockOnly], reloadFromFirstPage)
watch(page, load)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reloadFromFirstPage, 400)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

/** "Missing (12)": one text, the tab lays its children out as separate flex items. */
function tabLabel(kind: 'missing' | 'invalid'): string {
  const label = kind === 'missing' ? t('eshop.weights.tabs.missing') : t('eshop.weights.tabs.invalid')
  return counts.value ? `${label} (${counts.value[kind]})` : label
}

const columns = computed(() =>
  defineVaDataTableColumns([
    { label: t('eshop.weights.columns.code'), key: 'code' },
    { label: t('eshop.weights.columns.name'), key: 'name' },
    { label: t('eshop.weights.columns.price'), key: 'price', thAlign: 'right' },
    { label: t('eshop.weights.columns.active'), key: 'isActive', thAlign: 'center' },
    { label: t('eshop.weights.columns.webStatus'), key: 'webStatus' },
    { label: t('eshop.weights.columns.value'), key: 'weightRaw', thAlign: 'right' },
    { label: t('eshop.weights.columns.reason'), key: 'reason' },
  ]),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div class="flex-1 min-w-[16rem]">
            <h1 class="va-h5">{{ t('eshop.weights.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.weights.intro') }}</p>
          </div>
          <VaButton
            v-if="outletId && hasEshop"
            preset="secondary"
            size="small"
            icon="refresh"
            :loading="loading"
            @click="load"
          >
            {{ t('eshop.common.refresh') }}
          </VaButton>
        </div>

        <div v-if="!outletId" class="text-center text-slate-500 py-4">{{ t('eshop.common.selectOutlet') }}</div>
        <div v-else-if="!outlet" class="text-center text-slate-500 py-4">{{ t('eshop.common.loadingOutlet') }}</div>
        <VaAlert v-else-if="!hasEshop" color="info" border="left">{{ t('eshop.common.noEshop') }}</VaAlert>
        <template v-else>
          <div v-if="counts" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="rounded-lg border border-slate-200 p-3">
              <div class="text-xs text-slate-500">{{ t('eshop.weights.counts.items') }}</div>
              <div class="text-xl font-semibold">{{ counts.items }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-3">
              <div class="text-xs text-slate-500">{{ t('eshop.weights.counts.ok') }}</div>
              <div class="text-xl font-semibold text-success">{{ counts.ok }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-3">
              <div class="text-xs text-slate-500">{{ t('eshop.weights.counts.missing') }}</div>
              <div class="text-xl font-semibold text-danger">{{ counts.missing }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-3">
              <div class="text-xs text-slate-500">{{ t('eshop.weights.counts.invalid') }}</div>
              <div class="text-xl font-semibold text-warning">{{ counts.invalid }}</div>
            </div>
          </div>

          <VaTabs v-model="status">
            <template #tabs>
              <VaTab name="missing">{{ tabLabel('missing') }}</VaTab>
              <VaTab name="invalid">{{ tabLabel('invalid') }}</VaTab>
            </template>
          </VaTabs>

          <div class="flex items-end gap-4 flex-wrap mt-4">
            <div class="w-72">
              <VaInput
                v-model="search"
                maxlength="80"
                clearable
                :label="t('eshop.weights.search')"
                :placeholder="t('eshop.weights.searchPlaceholder')"
              />
            </div>
            <VaCheckbox v-model="withStockOnly" :label="t('eshop.weights.withStockOnly')" class="mb-2" />
          </div>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.weights.withStockOnlyHelp') }}</p>

          <VaAlert v-if="error" color="danger" border="left" class="mt-3">{{ error }}</VaAlert>

          <VaDataTable
            class="mt-3"
            :columns="columns"
            :items="rows"
            :loading="loading"
            :style="{
              '--va-data-table-thead-background': 'var(--va-background-element)',
              '--va-data-table-thead-color': '#2C82E0',
            }"
            sticky-header
          >
            <template #cell(code)="{ rowData }">
              <span class="font-mono text-xs">{{ rowData.code }}</span>
            </template>
            <template #cell(price)="{ rowData }">
              <div class="text-right">{{ formatPrice(rowData.price) || '—' }}</div>
            </template>
            <template #cell(isActive)="{ rowData }">
              <div class="flex justify-center">
                <VaBadge
                  :text="rowData.isActive ? t('eshop.common.yes') : t('eshop.common.no')"
                  :color="rowData.isActive ? 'success' : 'secondary'"
                />
              </div>
            </template>
            <template #cell(webStatus)="{ rowData }">
              <VaBadge
                :text="t(webStatusView(rowData.webStatus).key)"
                :color="webStatusView(rowData.webStatus).color"
              />
            </template>
            <template #cell(weightRaw)="{ rowData }">
              <div class="text-right">{{ formatNumber(rowData.weightRaw) || '—' }}</div>
            </template>
            <template #cell(reason)="{ rowData }">
              <div>{{ weightReasonText(rowData.reason, t) || '—' }}</div>
              <div v-if="rowData.reason" class="text-xs text-slate-400 font-mono">{{ rowData.reason }}</div>
            </template>
            <template #bodyAppend>
              <tr v-if="!loading && !rows.length && !error">
                <td :colspan="columns.length" class="text-center text-slate-500 py-4">
                  {{ status === 'missing' ? t('eshop.weights.emptyMissing') : t('eshop.weights.emptyInvalid') }}
                </td>
              </tr>
            </template>
          </VaDataTable>

          <div class="flex items-center justify-between gap-3 flex-wrap mt-4">
            <span class="text-xs text-slate-500">{{ t('eshop.weights.total', { n: total }) }}</span>
            <VaPagination
              v-if="pages > 1"
              v-model="page"
              :pages="pages"
              :visible-pages="5"
              buttons-preset="secondary"
            />
          </div>
        </template>
      </VaCardContent>
    </VaCard>
  </div>
</template>
