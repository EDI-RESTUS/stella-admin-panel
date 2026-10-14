// Helpers of the E-shop pages: API errors, dates, names, statuses, and the
// settings form <-> body of PUT /eshop/settings/:outletId. That PUT replaces
// the WHOLE settings object (a missing key falls back to its default) and its
// zod schema (eshopSettingsBody) is .strict(): the body is the settings object
// GET returned — every key this page does not edit (maxMirrorAgeSeconds, a
// later phase's couriers, …) goes back exactly as loaded — with the edited
// keys replaced. So it never carries a key the same backend did not return,
// and never resets a setting this page does not show.

export const HEX24 = /^[0-9a-f]{24}$/i
export const POSTCODE = /^\d{4}$/
export const CYPRUS_DISTRICTS = ['Lefkosia', 'Lemesos', 'Larnaka', 'Pafos', 'Ammochostos', 'Keryneia']
/** District select value for "no region" (a real '' renders the VaSelect blank). */
export const NO_REGION = '__none__'

type Translate = (key: string, named?: Record<string, unknown>) => string

/**
 * The message of a failed call: the backend's JSON message when it sent one;
 * a 404 without one is Express's own page — the server has no e-shop routes yet.
 */
export function eshopApiError(err: any, fallback: string, t: Translate): string {
  const res = err?.response
  if (!res) return fallback
  const data = res.data
  if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()) return data.message
  if (res.status === 404) return t('eshop.common.notDeployed')
  return fallback
}

export function formatDateTime(v?: string | null): string {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
}

/** A menu item name: a string or { en, el, … } — the navbar language, then en. */
export function plainName(name: any, locale = 'en'): string {
  if (!name) return ''
  if (typeof name === 'string') return name
  return name[locale] || name.en || (Object.values(name).find((v) => typeof v === 'string' && v) as string) || ''
}

export function formatPrice(v: any): string {
  const n = Number(v)
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? '' : `€${n.toFixed(2)}`
}

export function formatNumber(v: any): string {
  const n = Number(v)
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? '' : String(n)
}

/** Web status of an item (menuitems.eshopStock.status) → label key + badge colour. */
export function webStatusView(status?: string | null): { key: string; color: string } {
  switch (status) {
    case 'available':
      return { key: 'eshop.common.status.available', color: 'success' }
    case 'low':
      return { key: 'eshop.common.status.low', color: 'warning' }
    case 'none':
      return { key: 'eshop.common.status.none', color: 'danger' }
    case 'digital':
      return { key: 'eshop.common.status.digital', color: 'info' }
    default:
      return { key: 'eshop.common.status.unknown', color: 'secondary' }
  }
}

/** Why the e-shop jobs are idle (the backend resolver's reason, or "busy" from a resync) in plain words. */
export function idleReasonText(reason: string, t: Translate): string {
  const known: Record<string, string> = {
    'no e-shop settings': 'eshop.common.reasons.noSettings',
    'e-shop disabled': 'eshop.common.reasons.disabled',
    'settings have problems': 'eshop.common.reasons.problems',
    busy: 'eshop.common.reasons.busy',
  }
  const key = known[String(reason || '').trim()]
  return key ? t(key) : String(reason || '')
}

/** A weight reason code (backend eshopWeights.parseArticleWeight) in plain words; unknown codes as they are. */
export function weightReasonText(reason: string, t: Translate): string {
  const codes = [
    'NO_VALUE',
    'ZERO',
    'NOT_A_NUMBER',
    'NEGATIVE',
    'LOOKS_LIKE_GRAMS',
    'LOOKS_LIKE_KG',
    'TOO_SMALL',
    'TOO_HEAVY',
  ]
  const code = String(reason || '').trim()
  return codes.includes(code) ? t(`eshop.weights.reasons.${code}`) : code
}

/* ------------------------------------------------------------ settings form */

/** Keys of a loaded object this page does not edit: saved back exactly as loaded. */
type Kept = Record<string, any>

export type EshopShopRow = {
  zoneId: string
  warehouseCode: string | number
  active: boolean
  pickupEnabled: boolean
  displayName: string
  tillOverride: string | number
  kept: Kept
}

export type EshopRegionRow = { key: string; label: string; priorityZoneIds: string[]; kept: Kept }

export type EshopPostcodeRow = { postalCode: string; regionKey: string }

export type EshopSettingsForm = {
  enabled: boolean
  /** Shown, never edited here (checkout comes in a later phase): saved back as loaded. */
  checkoutMode: 'off' | 'on'
  allowSplit: boolean
  shops: EshopShopRow[]
  regions: EshopRegionRow[]
  /** district → region key, NO_REGION for none. */
  districtRegions: Record<string, string>
  postcodeRegions: EshopPostcodeRow[]
  tareGrams: string | number
  reservationMinutes: string | number
  weight: { priceLevel: string | number; withTaxes: boolean; unit: 'kg' | 'g'; kept: Kept }
  shippingArticleCode: string
  /** Comma lists as typed. */
  nonStockArticleCodes: string
  alertEmails: string
  alertPhones: string
  /** Every other key of the loaded settings (maxMirrorAgeSeconds, couriers, …). */
  kept: Kept
}

const SETTINGS_KEYS = [
  'enabled',
  'checkoutMode',
  'allowSplit',
  'shops',
  'regions',
  'districtRegions',
  'postcodeRegions',
  'tareGrams',
  'reservationMinutes',
  'weight',
  'shippingArticleCode',
  'nonStockArticleCodes',
  'alertEmails',
  'alertPhones',
]
const SHOP_KEYS = ['zoneId', 'warehouseCode', 'active', 'pickupEnabled', 'displayName', 'tillOverride']
const REGION_KEYS = ['key', 'label', 'priorityZoneIds']
const WEIGHT_KEYS = ['priceLevel', 'withTaxes', 'unit']

const text = (v: unknown): string => (v === undefined || v === null ? '' : String(v))
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : [])
const isPlainObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v)
/** A deep copy of the keys of `o` not in `edited`. */
const keptOf = (o: unknown, edited: string[]): Kept => {
  const out: Kept = {}
  if (!isPlainObject(o)) return out
  for (const [k, v] of Object.entries(o)) {
    if (!edited.includes(k) && v !== undefined) out[k] = JSON.parse(JSON.stringify(v))
  }
  return out
}
/** Finite number or undefined. */
const finite = (v: unknown): number | undefined => {
  const n = Number(v)
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? undefined : n
}
/** A whole number typed in a field, or NaN. */
const whole = (v: unknown): number => {
  const s = text(v).trim()
  return /^-?\d+$/.test(s) ? Number(s) : NaN
}
/** "a, b; c" (or one per line) → ['a', 'b', 'c'], without repeats. */
export const splitList = (v: string): string[] =>
  Array.from(
    new Set(
      text(v)
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  )

/** A shop row for a zone added on this page. */
export function newShopRow(zoneId: string, warehouseCode: number | ''): EshopShopRow {
  return { zoneId, warehouseCode, active: true, pickupEnabled: true, displayName: '', tillOverride: 0, kept: {} }
}

/** The form state for the `settings` of GET /eshop/settings (already normalised by the backend). */
export function formFromSettings(s: any, districts: string[] = CYPRUS_DISTRICTS): EshopSettingsForm {
  const src = isPlainObject(s) ? s : {}
  const w = isPlainObject(src.weight) ? src.weight : {}
  const byDistrict = new Map<string, string>()
  for (const e of Array.isArray(src.districtRegions) ? src.districtRegions : []) {
    if (e?.district) byDistrict.set(text(e.district), text(e.regionKey))
  }
  const districtRegions: Record<string, string> = {}
  for (const d of districts) districtRegions[d] = byDistrict.get(d) || NO_REGION
  return {
    enabled: src.enabled === true,
    checkoutMode: src.checkoutMode === 'on' ? 'on' : 'off',
    allowSplit: src.allowSplit === true,
    // The PUT only ever stores 24-hex zone ids; anything else could not be saved back.
    shops: (Array.isArray(src.shops) ? src.shops : [])
      .filter((sh: any) => HEX24.test(text(sh?.zoneId)))
      .map((sh: any) => ({
        zoneId: text(sh.zoneId).toLowerCase(),
        warehouseCode: Number.isInteger(sh.warehouseCode) && sh.warehouseCode > 0 ? sh.warehouseCode : '',
        active: sh.active !== false,
        pickupEnabled: sh.pickupEnabled !== false,
        displayName: text(sh.displayName),
        tillOverride: Number.isInteger(sh.tillOverride) && sh.tillOverride > 0 ? sh.tillOverride : 0,
        kept: keptOf(sh, SHOP_KEYS),
      })),
    regions: (Array.isArray(src.regions) ? src.regions : []).map((g: any) => ({
      key: text(g?.key),
      label: text(g?.label),
      priorityZoneIds: list(g?.priorityZoneIds)
        .filter((id) => HEX24.test(id))
        .map((id) => id.toLowerCase()),
      kept: keptOf(g, REGION_KEYS),
    })),
    districtRegions,
    postcodeRegions: (Array.isArray(src.postcodeRegions) ? src.postcodeRegions : []).map((e: any) => ({
      postalCode: text(e?.postalCode),
      regionKey: text(e?.regionKey) || NO_REGION,
    })),
    tareGrams: finite(src.tareGrams) ?? 150,
    reservationMinutes: finite(src.reservationMinutes) ?? 15,
    weight: {
      priceLevel: finite(w.priceLevel) ?? 9,
      withTaxes: w.withTaxes !== false,
      unit: w.unit === 'g' ? 'g' : 'kg',
      kept: keptOf(w, WEIGHT_KEYS),
    },
    shippingArticleCode: text(src.shippingArticleCode),
    nonStockArticleCodes: list(src.nonStockArticleCodes).join(', '),
    alertEmails: list(src.alertEmails).join(', '),
    alertPhones: list(src.alertPhones).join(', '),
    kept: keptOf(src, SETTINGS_KEYS),
  }
}

const EMAIL = /^[^\s,;]+@[^\s,;]+\.[^\s,;]+$/
const PHONE = /^\+?[0-9][0-9 ()-]{3,39}$/

/**
 * The body of PUT /eshop/settings/:outletId and what is wrong with the form.
 * The body is null while anything is wrong.
 */
export function settingsPayloadFromForm(
  form: EshopSettingsForm,
  ctx: { districts: string[]; shopName: (zoneId: string) => string; t: Translate },
): { payload: Record<string, any> | null; errors: string[] } {
  const { t } = ctx
  const errors: string[] = []

  const reservationMinutes = whole(form.reservationMinutes)
  if (!(reservationMinutes >= 1 && reservationMinutes <= 60)) errors.push(t('eshop.settings.errors.reservationMinutes'))
  const tareGrams = whole(form.tareGrams)
  if (!(tareGrams >= 0 && tareGrams <= 100000)) errors.push(t('eshop.settings.errors.tareGrams'))
  const priceLevel = whole(form.weight.priceLevel)
  if (!(priceLevel >= 1 && priceLevel <= 9)) errors.push(t('eshop.settings.errors.priceLevel'))

  const shippingArticleCode = text(form.shippingArticleCode).trim()
  if (shippingArticleCode.length > 40) errors.push(t('eshop.settings.errors.shippingArticleCode'))
  const nonStockArticleCodes = splitList(form.nonStockArticleCodes)
  if (nonStockArticleCodes.length > 500 || nonStockArticleCodes.some((c) => c.length > 40)) {
    errors.push(t('eshop.settings.errors.nonStock'))
  }
  const alertEmails = splitList(form.alertEmails)
  const badEmail = alertEmails.find((e) => e.length > 200 || !EMAIL.test(e))
  if (badEmail) errors.push(t('eshop.settings.errors.alertEmail', { value: badEmail }))
  if (alertEmails.length > 20) errors.push(t('eshop.settings.errors.alertEmailsCount'))
  const alertPhones = splitList(form.alertPhones)
  const badPhone = alertPhones.find((p) => p.length > 40 || !PHONE.test(p))
  if (badPhone) errors.push(t('eshop.settings.errors.alertPhone', { value: badPhone }))
  if (alertPhones.length > 20) errors.push(t('eshop.settings.errors.alertPhonesCount'))

  if (form.shops.length > 30) errors.push(t('eshop.settings.errors.shopsCount'))
  const shops = form.shops.map((sh) => {
    const name = ctx.shopName(sh.zoneId)
    const warehouseCode = whole(sh.warehouseCode)
    if (!(warehouseCode >= 1)) errors.push(t('eshop.settings.errors.warehouseCode', { name }))
    const tillText = text(sh.tillOverride).trim()
    const tillOverride = tillText === '' ? 0 : whole(tillText)
    if (!(tillOverride >= 0)) errors.push(t('eshop.settings.errors.tillOverride', { name }))
    const displayName = text(sh.displayName).trim()
    if (displayName.length > 80) errors.push(t('eshop.settings.errors.displayName', { name }))
    return {
      ...sh.kept,
      zoneId: sh.zoneId,
      warehouseCode,
      active: sh.active === true,
      pickupEnabled: sh.pickupEnabled === true,
      displayName,
      tillOverride,
    }
  })

  const regionKeys = new Set(form.regions.map((g) => g.key))
  const regions = form.regions.map((g) => {
    const label = text(g.label).trim()
    if (label.length > 60) errors.push(t('eshop.settings.errors.regionLabel', { name: g.key }))
    if (g.priorityZoneIds.length > 20) errors.push(t('eshop.settings.errors.regionShops', { name: label || g.key }))
    return { ...g.kept, key: g.key, label, priorityZoneIds: [...g.priorityZoneIds] }
  })

  const districtRegions = ctx.districts
    .filter((d) => form.districtRegions[d] && form.districtRegions[d] !== NO_REGION)
    .map((d) => ({ district: d, regionKey: form.districtRegions[d] }))

  const seen = new Set<string>()
  const postcodeRegions: Array<{ postalCode: string; regionKey: string }> = []
  for (const row of form.postcodeRegions) {
    const postalCode = text(row.postalCode).trim()
    if (!POSTCODE.test(postalCode)) {
      errors.push(t('eshop.settings.errors.postcode', { value: postalCode || '…' }))
      continue
    }
    if (seen.has(postalCode)) {
      errors.push(t('eshop.settings.errors.postcodeTwice', { value: postalCode }))
      continue
    }
    seen.add(postalCode)
    if (!row.regionKey || row.regionKey === NO_REGION || !regionKeys.has(row.regionKey)) {
      errors.push(t('eshop.settings.errors.postcodeRegion', { value: postalCode }))
      continue
    }
    postcodeRegions.push({ postalCode, regionKey: row.regionKey })
  }
  if (postcodeRegions.length > 2000) errors.push(t('eshop.settings.errors.postcodesCount'))

  if (errors.length) return { payload: null, errors }
  return {
    payload: {
      ...form.kept,
      enabled: form.enabled === true,
      checkoutMode: form.checkoutMode === 'on' ? 'on' : 'off',
      allowSplit: form.allowSplit === true,
      shops,
      regions,
      districtRegions,
      postcodeRegions,
      tareGrams,
      reservationMinutes,
      weight: {
        ...form.weight.kept,
        priceLevel,
        withTaxes: form.weight.withTaxes === true,
        unit: form.weight.unit === 'g' ? 'g' : 'kg',
      },
      shippingArticleCode,
      nonStockArticleCodes,
      alertEmails,
      alertPhones,
    },
    errors,
  }
}
