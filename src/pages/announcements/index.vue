<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useToast, useModal, defineVaDataTableColumns } from 'vuestic-ui'
import { useServiceStore } from '@/stores/services'
import { useUsersStore } from '@/stores/users'
import AnnouncementModal from './modals/AnnouncementModal.vue'

const { t, locale } = useI18n()
const { init } = useToast()
const { confirm } = useModal()
const servicesStore = useServiceStore()
const usersStore = useUsersStore()
const url = import.meta.env.VITE_API_BASE_URL

// Outlet comes from the top-navbar selection, like the rest of the panel.
const outletId = computed(() => servicesStore.selectedRest || '')
// Publish / schedule / push are admin-only on the backend (ANNOUNCEMENT_SENDER_ROLES).
// userDetails is null on a hard refresh until the sidebar's GET /users/:id
// resolves — null counts as "not allowed" until then.
const canSend = computed(() => ['admin', 'super-admin'].includes((usersStore.userDetails as any)?.role))
const isEditor = computed(() => (usersStore.userDetails as any)?.role === 'editor')

// null = not loaded yet; false shows the "switched off" banner.
const announcementsEnabled = ref<boolean | null>(null)
const items = ref<any[]>([])
const loading = ref(false)
const busyId = ref<string | null>(null)
// 'all' = no status param; a real '' would render the VaSelect blank.
const ALL_STATUSES = 'all'
const statusFilter = ref(ALL_STATUSES)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const isModalOpen = ref(false)
const selected = ref<any>(null)

const STATUSES = ['draft', 'scheduled', 'published', 'archived']
const statusOptions = computed(() => [
  { text: t('announcements.filterAll'), value: ALL_STATUSES },
  ...STATUSES.map((status) => ({ text: t(`announcements.status.${status}`), value: status })),
])
// The outlet's switch is known to be off: create / publish / push can only
// answer 400 ANNOUNCEMENTS_DISABLED, so those buttons are disabled (the
// banner says where to switch it on). Edit stays: the modal doubles as a viewer.
const writesBlocked = computed(() => announcementsEnabled.value === false)
const statusColors: Record<string, string> = {
  draft: 'secondary',
  scheduled: 'info',
  published: 'success',
  archived: 'warning',
}
const pushColors: Record<string, string> = {
  idle: 'secondary',
  queued: 'info',
  sending: 'info',
  sent: 'success',
  failed: 'danger',
  not_configured: 'warning',
  disabled: 'secondary',
}

const columns = computed(() =>
  defineVaDataTableColumns([
    { label: t('announcements.columns.title'), key: 'title', sortable: false },
    { label: t('announcements.columns.status'), key: 'status', sortable: false },
    { label: t('announcements.columns.pinned'), key: 'pinned', sortable: false, thAlign: 'center' },
    { label: t('announcements.columns.publishAt'), key: 'publishAt', sortable: false },
    { label: t('announcements.columns.expiresAt'), key: 'expiresAt', sortable: false },
    { label: t('announcements.columns.push'), key: 'push', sortable: false },
    { label: t('announcements.columns.updatedAt'), key: 'updatedAt', sortable: false },
    { label: t('announcements.columns.actions'), key: 'actions', sortable: false, thAlign: 'right' },
  ]),
)

// title / body are a string or { en, el } — show the navbar language, then en.
function localized(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return val[locale.value] || val.en || (Object.values(val).find(Boolean) as string) || ''
}

function formatDateTime(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function errorMessage(err: any, fallback: string) {
  if (err?.response?.data?.code === 'ANNOUNCEMENTS_DISABLED') return t('announcements.disabledBanner')
  return err?.response?.data?.message || fallback
}

function replaceRow(doc: any) {
  if (!doc?._id) return
  const index = items.value.findIndex((row) => row._id === doc._id)
  if (index >= 0) items.value.splice(index, 1, doc)
}

/* ---------------- Loading ---------------- */
async function loadOutlet() {
  announcementsEnabled.value = null
  if (!outletId.value) return
  try {
    const { data } = await axios.get(`${url}/outlets/${outletId.value}`)
    announcementsEnabled.value = data?.customerSettings?.announcementsEnabled === true
  } catch (err: any) {
    init({ message: err?.response?.data?.message || t('announcements.toast.outletLoadFailed'), color: 'danger' })
  }
}

async function loadAnnouncements() {
  if (!outletId.value) {
    items.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const params: any = { outletId: outletId.value, page: page.value, limit: limit.value }
    if (statusFilter.value !== ALL_STATUSES) params.status = statusFilter.value
    const { data } = await axios.get(`${url}/announcements`, { params })
    items.value = data?.data?.items || []
    total.value = data?.data?.meta?.total || 0
    // A send still running from before this load: keep watching it.
    items.value.filter((row) => isPushRunning(row)).forEach((row) => pollPush(row._id))
  } catch (err: any) {
    init({ message: err?.response?.data?.message || t('announcements.toast.loadFailed'), color: 'danger' })
  } finally {
    loading.value = false
  }
}

function reload() {
  loadOutlet()
  loadAnnouncements()
}

watch(outletId, () => {
  page.value = 1
  reload()
})
watch(statusFilter, () => {
  page.value = 1
  loadAnnouncements()
})
watch(page, loadAnnouncements)

onMounted(async () => {
  if (!servicesStore.items.length) {
    try {
      await servicesStore.getAll()
    } catch {
      /* navbar usually loads these; ignore if it fails here */
    }
  }
  reload()
})

/* ---------------- Push polling ---------------- */
// POST /push answers `queued`; the fan-out runs in the background and writes
// its outcome on `push` — there is no websocket, so the row is re-read every
// few seconds until it settles (or we give up and leave it to Refresh).
const POLL_MS = 3000
const POLL_MAX = 40
const pollTimers: Record<string, ReturnType<typeof setTimeout>> = {}

function isPushRunning(row: any) {
  return ['queued', 'sending'].includes(row?.push?.status)
}

function pollPush(id: string, attempt = 0) {
  clearTimeout(pollTimers[id])
  if (attempt >= POLL_MAX) return
  pollTimers[id] = setTimeout(async () => {
    try {
      const { data } = await axios.get(`${url}/announcements/${id}`)
      replaceRow(data?.data)
      if (isPushRunning(data?.data)) pollPush(id, attempt + 1)
    } catch {
      /* the next Refresh shows the outcome */
    }
  }, POLL_MS)
}

onBeforeUnmount(() => {
  Object.values(pollTimers).forEach((timer) => clearTimeout(timer))
})

/* ---------------- Actions ---------------- */
function openCreate() {
  selected.value = null
  isModalOpen.value = true
}

function openEdit(row: any) {
  selected.value = row
  isModalOpen.value = true
}

function onModalClosed() {
  isModalOpen.value = false
  selected.value = null
  loadAnnouncements()
}

async function onPublish(row: any) {
  if (!canSend.value || writesBlocked.value || row.status === 'published') return
  const ok = await confirm({
    message: t('announcements.confirm.publishMessage'),
    okText: t('announcements.confirm.yes'),
    cancelText: t('announcements.confirm.no'),
    size: 'medium',
    title: t('announcements.confirm.publishTitle'),
  })
  if (!ok) return
  busyId.value = row._id
  try {
    const { data } = await axios.post(`${url}/announcements/${row._id}/publish`)
    replaceRow(data?.data)
    init({ message: t('announcements.toast.published'), color: 'success' })
    if (isPushRunning(data?.data)) pollPush(row._id)
  } catch (err: any) {
    init({ message: errorMessage(err, t('announcements.toast.publishFailed')), color: 'danger' })
  } finally {
    busyId.value = null
  }
}

async function onPush(row: any) {
  if (!canSend.value || writesBlocked.value || row.status !== 'published' || isPushRunning(row)) return
  const resend = row.push?.status === 'sent'
  const ok = await confirm({
    message: resend ? t('announcements.confirm.pushAgainMessage') : t('announcements.confirm.pushMessage'),
    okText: t('announcements.confirm.yes'),
    cancelText: t('announcements.confirm.no'),
    size: 'medium',
    title: t('announcements.confirm.pushTitle'),
  })
  if (!ok) return
  busyId.value = row._id
  try {
    const { data } = await axios.post(`${url}/announcements/${row._id}/push`, resend ? { resend: true } : {})
    replaceRow(data?.data)
    const status = data?.data?.push?.status
    if (status === 'queued') {
      init({ message: t('announcements.toast.pushQueued'), color: 'success' })
      pollPush(row._id)
    } else if (status === 'not_configured') {
      init({ message: t('announcements.toast.pushNotConfigured'), color: 'warning' })
    } else {
      init({ message: t('announcements.toast.pushRequested'), color: 'success' })
    }
  } catch (err: any) {
    init({ message: errorMessage(err, t('announcements.toast.pushFailed')), color: 'danger' })
  } finally {
    busyId.value = null
  }
}

async function onDelete(row: any) {
  const ok = await confirm({
    message: t('announcements.confirm.deleteMessage'),
    okText: t('announcements.confirm.yes'),
    cancelText: t('announcements.confirm.no'),
    size: 'medium',
    title: t('announcements.confirm.deleteTitle'),
  })
  if (!ok) return
  busyId.value = row._id
  try {
    await axios.delete(`${url}/announcements/${row._id}`)
    clearTimeout(pollTimers[row._id])
    init({ message: t('announcements.toast.deleted'), color: 'success' })
    if (items.value.length === 1 && page.value > 1) {
      page.value -= 1 // the page watcher reloads
    } else {
      loadAnnouncements()
    }
  } catch (err: any) {
    init({ message: errorMessage(err, t('announcements.toast.deleteFailed')), color: 'danger' })
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 class="va-h5">{{ t('announcements.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('announcements.intro') }}</p>
          </div>
          <div class="flex items-end gap-2 flex-wrap">
            <div class="w-44">
              <VaSelect
                v-model="statusFilter"
                :options="statusOptions"
                value-by="value"
                text-by="text"
                :label="t('announcements.filterStatus')"
                size="small"
              />
            </div>
            <VaButton preset="secondary" size="small" icon="refresh" :loading="loading" @click="reload">
              {{ t('announcements.refresh') }}
            </VaButton>
            <VaButton size="small" icon="add" :disabled="!outletId || writesBlocked" @click="openCreate">
              {{ t('announcements.add') }}
            </VaButton>
          </div>
        </div>

        <VaAlert v-if="announcementsEnabled === false" color="warning" border="left" class="mb-4">
          {{ t('announcements.disabledBanner') }}
        </VaAlert>
        <VaAlert v-if="isEditor" color="info" border="left" class="mb-4">
          {{ t('announcements.editorNote') }}
        </VaAlert>

        <div v-if="!outletId" class="text-center text-slate-500 py-4">{{ t('announcements.selectOutlet') }}</div>

        <VaDataTable
          v-else
          :columns="columns"
          :items="items"
          :loading="loading"
          :style="{
            '--va-data-table-thead-background': 'var(--va-background-element)',
            '--va-data-table-thead-color': '#2C82E0',
          }"
          :no-data-html="t('announcements.empty')"
          sticky-header
        >
          <template #cell(title)="{ rowData }">
            <div class="flex items-center gap-2">
              <img
                v-if="rowData.imageUrl"
                :src="rowData.imageUrl"
                alt=""
                class="w-8 h-8 rounded object-cover border shrink-0"
              />
              <div class="min-w-0">
                <div class="font-semibold">{{ localized(rowData.title) || '—' }}</div>
                <div class="text-xs text-slate-500 truncate max-w-md">{{ localized(rowData.body) }}</div>
              </div>
            </div>
          </template>

          <template #cell(status)="{ rowData }">
            <VaBadge
              :text="t(`announcements.status.${rowData.status}`)"
              :color="statusColors[rowData.status] || 'secondary'"
            />
          </template>

          <template #cell(pinned)="{ rowData }">
            <div class="flex justify-center">
              <VaIcon v-if="rowData.pinned" name="push_pin" size="small" />
              <span v-else class="text-slate-400">—</span>
            </div>
          </template>

          <template #cell(publishAt)="{ rowData }">
            {{ formatDateTime(rowData.publishAt) }}
          </template>

          <template #cell(expiresAt)="{ rowData }">
            {{ formatDateTime(rowData.expiresAt) }}
          </template>

          <template #cell(push)="{ rowData }">
            <div class="flex flex-col items-start gap-1">
              <VaBadge
                :text="t(`announcements.push.${rowData.push?.status || 'idle'}`)"
                :color="pushColors[rowData.push?.status] || 'secondary'"
              />
              <span v-if="rowData.push?.runs" class="text-xs text-slate-500 whitespace-nowrap">
                {{
                  t('announcements.pushCounts', {
                    sent: rowData.push.sentCount || 0,
                    failed: rowData.push.failedCount || 0,
                  })
                }}
              </span>
            </div>
          </template>

          <template #cell(updatedAt)="{ rowData }">
            {{ formatDateTime(rowData.updatedAt) }}
          </template>

          <template #cell(actions)="{ rowData }">
            <div class="flex justify-end items-center gap-1 flex-wrap">
              <VaButton
                preset="secondary"
                size="small"
                icon="edit"
                :disabled="busyId === rowData._id"
                @click="openEdit(rowData)"
              >
                {{ t('announcements.actions.edit') }}
              </VaButton>
              <VaButton
                v-if="canSend"
                preset="secondary"
                size="small"
                icon="publish"
                :disabled="writesBlocked || rowData.status === 'published' || busyId === rowData._id"
                @click="onPublish(rowData)"
              >
                {{ t('announcements.actions.publish') }}
              </VaButton>
              <VaButton
                v-if="canSend && rowData.status === 'published'"
                preset="secondary"
                size="small"
                icon="send"
                :disabled="writesBlocked || isPushRunning(rowData) || busyId === rowData._id"
                @click="onPush(rowData)"
              >
                {{
                  rowData.push?.status === 'sent'
                    ? t('announcements.actions.pushAgain')
                    : t('announcements.actions.push')
                }}
              </VaButton>
              <VaButton
                preset="secondary"
                size="small"
                icon="mso-delete"
                color="danger"
                :disabled="busyId === rowData._id"
                @click="onDelete(rowData)"
              >
                {{ t('announcements.actions.delete') }}
              </VaButton>
            </div>
          </template>
        </VaDataTable>

        <div v-if="outletId && pages > 1" class="flex justify-center mt-4">
          <VaPagination v-model="page" :pages="pages" :visible-pages="5" buttons-preset="secondary" />
        </div>
      </VaCardContent>
    </VaCard>

    <AnnouncementModal
      v-if="isModalOpen"
      :selected-option="selected"
      :outlet-id="outletId"
      :can-send="canSend"
      @cancel="onModalClosed"
    />
  </div>
</template>
