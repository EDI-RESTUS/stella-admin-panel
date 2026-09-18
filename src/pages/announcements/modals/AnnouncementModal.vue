<template>
  <VaModal
    v-model="isVisible"
    class="big-form"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    close-button
  >
    <template #header>
      <h1 class="va-h6 mb-5">
        {{ isUpdating ? t('announcements.form.editTitle') : t('announcements.form.addTitle') }}
      </h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-4">
        <div class="grid md:grid-cols-2 gap-4">
          <VaInput
            v-model="formData.title.en"
            :label="t('announcements.form.titleEn')"
            :rules="[validators.required]"
            required-mark
            maxlength="200"
          />
          <VaInput v-model="formData.title.el" :label="t('announcements.form.titleEl')" maxlength="200" />
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <VaTextarea
            v-model="formData.body.en"
            :label="t('announcements.form.bodyEn')"
            :rules="[validators.required, bodyLengthRule]"
            required-mark
            :min-rows="4"
            :max-rows="12"
            class="w-full"
          />
          <VaTextarea
            v-model="formData.body.el"
            :label="t('announcements.form.bodyEl')"
            :rules="[bodyLengthRule]"
            :min-rows="4"
            :max-rows="12"
            class="w-full"
          />
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <VaInput
            v-model="formData.imageUrl"
            :label="t('announcements.form.imageUrl')"
            :rules="[imageUrlRule]"
            placeholder="https://"
          />
          <div class="flex flex-col gap-2">
            <label
              class="va-input-label va-input-wrapper__label va-input-wrapper__label--outer text-primary font-semibold"
              >{{ t('announcements.form.imageUpload') }}</label
            >
            <FileUpload :selected-rest="outletId" accepted-file-types="image/*" @uploadSuccess="onUploaded" />
          </div>
        </div>
        <div v-if="formData.imageUrl" class="flex items-start gap-4">
          <img :src="formData.imageUrl" alt="" class="w-32 h-32 rounded-lg object-cover border" />
          <VaButton preset="primary" color="danger" icon="mso-delete" size="small" class="mt-2" @click="removeImage">
            {{ t('announcements.form.removeImage') }}
          </VaButton>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <VaInput
            v-model="formData.link"
            :label="t('announcements.form.link')"
            :rules="[linkRule]"
            :messages="[t('announcements.form.linkHelp')]"
          />
          <VaInput v-model="formData.linkLabel" :label="t('announcements.form.linkLabel')" maxlength="60" />
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <VaSwitch v-model="formData.pinned" :label="t('announcements.form.pinned')" size="small" />
          <VaSwitch v-model="formData.pushOnPublish" :label="t('announcements.form.pushOnPublish')" size="small" />
        </div>

        <div v-if="isPublished" class="va-text-secondary text-xs">{{ t('announcements.form.publishedNote') }}</div>
        <div v-else>
          <div class="va-input-label text-primary font-semibold mb-1">{{ t('announcements.form.mode') }}</div>
          <VaRadio v-model="mode" :options="modeOptions" value-by="value" size="small" class="w-fit" />
          <div v-if="editorScheduled" class="va-text-secondary text-xs mt-1">
            {{ t('announcements.form.editorScheduledNote') }}
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div v-if="!isPublished && mode === 'schedule'" class="flex flex-col gap-1">
            <label class="va-input-label text-primary font-semibold">{{ t('announcements.form.publishAt') }}</label>
            <input v-model="formData.publishAt" type="datetime-local" class="w-full border rounded-lg px-3 py-2" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="va-input-label text-primary font-semibold">{{ t('announcements.form.expiresAt') }}</label>
            <input v-model="formData.expiresAt" type="datetime-local" class="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
      </div>
    </VaForm>

    <template #footer>
      <div class="flex justify-end mt-6">
        <VaButton type="submit" :loading="saving" :disabled="saving" @click="submit()">{{ submitLabel }}</VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useForm, useToast } from 'vuestic-ui'
import { validators } from '@/services/utils'
import FileUpload from '@/components/file-uploader/FileUpload.vue'

const emits = defineEmits(['cancel'])

const props = defineProps({
  selectedOption: {
    type: Object,
    default: () => null,
  },
  outletId: {
    type: String,
    required: true,
  },
  // Admin (super-admin | admin): may publish now and schedule. Editors save drafts.
  canSend: {
    type: Boolean,
    default: false,
  },
})

const isVisible = ref(true)

watch(isVisible, (val) => {
  if (!val) emits('cancel')
})

const { t } = useI18n()
const { validate } = useForm('form')
const { init } = useToast()
const url = import.meta.env.VITE_API_BASE_URL

const saving = ref(false)
type Mode = 'draft' | 'publishNow' | 'schedule'
const mode = ref<Mode>('draft')

const formData = ref({
  _id: '',
  title: { en: '', el: '' },
  body: { en: '', el: '' },
  imageUrl: '',
  assetId: '',
  link: '',
  linkLabel: '',
  pinned: false,
  pushOnPublish: true,
  status: 'draft',
  publishAt: '', // datetime-local values
  expiresAt: '',
})

const isUpdating = computed(() => !!formData.value._id)
// "published" is reached only through POST /publish; a published announcement
// keeps its status here and its content edits go live at once.
const isPublished = computed(() => formData.value.status === 'published')
const editorScheduled = computed(() => !props.canSend && formData.value.status === 'scheduled')

const modeOptions = computed(() => {
  const options = [{ text: t('announcements.form.modeDraft'), value: 'draft' }]
  if (props.canSend) {
    options.push(
      { text: t('announcements.form.modePublishNow'), value: 'publishNow' },
      { text: t('announcements.form.modeSchedule'), value: 'schedule' },
    )
  }
  return options
})

const submitLabel = computed(() => {
  if (!isPublished.value && mode.value === 'publishNow') return t('announcements.form.saveAndPublish')
  if (!isPublished.value && mode.value === 'schedule') return t('announcements.form.saveAndSchedule')
  return t('announcements.form.save')
})

// Same shapes as the backend validator (announcements.zod.ts): images are
// https only; a link is https or an app deep link, never a script scheme.
const HTTPS_URL_RX = /^https:\/\/\S+$/i
const DEEP_LINK_RX = /^(?!https?:)[a-z][a-z0-9+.-]*:\/\/\S+$/i
const UNSAFE_LINK_SCHEME_RX = /^(javascript|data|vbscript|file|blob|about):/i
const BODY_MAX = 4000 // BODY_MAX of the backend validator
const bodyLengthRule = (v: string) => (v || '').trim().length <= BODY_MAX || t('announcements.form.bodyTooLong')
const imageUrlRule = (v: string) => !v || HTTPS_URL_RX.test(v.trim()) || t('announcements.form.imageUrlInvalid')
const linkRule = (v: string) => {
  const link = (v || '').trim()
  if (!link) return true
  const valid = !UNSAFE_LINK_SCHEME_RX.test(link) && (HTTPS_URL_RX.test(link) || DEEP_LINK_RX.test(link))
  return valid || t('announcements.form.linkInvalid')
}

// title / body come back as a string or { en, el }
function toLang(val: any): { en: string; el: string } {
  if (!val) return { en: '', el: '' }
  if (typeof val === 'string') return { en: val, el: '' }
  return { en: val.en || '', el: val.el || '' }
}

// "2026-08-25T14:30" in the browser's local time, for <input type="datetime-local">
function toLocalInputValue(v?: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIso(localValue: string): string | null {
  if (!localValue) return null
  const d = new Date(localValue)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function errorMessage(err: any, fallback: string) {
  if (err?.response?.data?.code === 'ANNOUNCEMENTS_DISABLED') return t('announcements.disabledBanner')
  return err?.response?.data?.message || fallback
}

watch(
  () => props.selectedOption,
  (val) => {
    if (!val) return
    formData.value = {
      _id: val._id || '',
      title: toLang(val.title),
      body: toLang(val.body),
      imageUrl: val.imageUrl || '',
      assetId: val.assetId ? String(val.assetId) : '',
      link: val.link || '',
      linkLabel: val.linkLabel || '',
      pinned: val.pinned === true,
      pushOnPublish: val.pushOnPublish !== false,
      status: val.status || 'draft',
      publishAt: toLocalInputValue(val.publishAt),
      expiresAt: toLocalInputValue(val.expiresAt),
    }
    // An editor cannot keep a schedule (backend SCHEDULE_FORBIDDEN): the only
    // mode offered is draft, and the note in the form says what that does.
    mode.value = val.status === 'scheduled' && props.canSend ? 'schedule' : 'draft'
  },
  { immediate: true },
)

const onUploaded = (data: any) => {
  formData.value.imageUrl = data?.url || ''
  formData.value.assetId = data?._id || ''
}

const removeImage = () => {
  const assetId = formData.value.assetId
  formData.value.imageUrl = ''
  formData.value.assetId = ''
  if (!assetId) return
  axios
    .delete(`${url}/assets/${assetId}`)
    .then(() => init({ message: t('announcements.toast.assetDeleted'), color: 'success' }))
    .catch((err) =>
      init({ message: err?.response?.data?.error || t('announcements.toast.assetDeleteFailed'), color: 'danger' }),
    )
}

const submit = async () => {
  if (saving.value || !validate()) return
  const f = formData.value
  const schedule = !isPublished.value && mode.value === 'schedule'
  const publishNow = !isPublished.value && mode.value === 'publishNow'
  const publishAt = toIso(f.publishAt)
  const expiresAt = toIso(f.expiresAt)

  if (schedule && !publishAt) {
    init({ message: t('announcements.toast.publishAtRequired'), color: 'danger' })
    return
  }
  if (schedule && expiresAt && publishAt && expiresAt <= publishAt) {
    init({ message: t('announcements.toast.expiresBeforePublish'), color: 'danger' })
    return
  }
  if (publishNow && expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    init({ message: t('announcements.toast.expiresInPast'), color: 'danger' })
    return
  }

  // Never "published" in the body — that is POST /announcements/:id/publish.
  const payload: any = {
    title: { en: f.title.en.trim(), el: f.title.el.trim() },
    body: { en: f.body.en.trim(), el: f.body.el.trim() },
    imageUrl: f.imageUrl.trim(),
    assetId: f.assetId || null,
    link: f.link.trim(),
    linkLabel: f.linkLabel.trim(),
    pinned: !!f.pinned,
    pushOnPublish: !!f.pushOnPublish,
    expiresAt,
  }
  if (!isPublished.value) {
    payload.status = schedule ? 'scheduled' : 'draft'
    payload.publishAt = schedule ? publishAt : null
  }

  saving.value = true
  try {
    let doc: any
    if (f._id) {
      const { data } = await axios.patch(`${url}/announcements/${f._id}`, payload)
      doc = data?.data
      init({ message: t('announcements.toast.saved'), color: 'success' })
    } else {
      const { data } = await axios.post(`${url}/announcements`, { ...payload, outletId: props.outletId })
      doc = data?.data
      init({ message: t('announcements.toast.created'), color: 'success' })
    }
    if (publishNow && doc?._id) {
      try {
        await axios.post(`${url}/announcements/${doc._id}/publish`)
        init({ message: t('announcements.toast.published'), color: 'success' })
      } catch (err: any) {
        // The draft is saved; the list's Publish action can retry.
        init({ message: errorMessage(err, t('announcements.toast.publishFailed')), color: 'danger' })
      }
    }
    emits('cancel')
  } catch (err: any) {
    init({ message: errorMessage(err, t('announcements.toast.saveFailed')), color: 'danger' })
  } finally {
    saving.value = false
  }
}
</script>
