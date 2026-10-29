// Helpers of the E-shop pages: API errors, dates, names, statuses, kg and
// euros, the courier fee table form <-> body of PUT /eshop/rates/..., and the
// settings form <-> body of PUT /eshop/settings/:outletId. That PUT replaces
// the WHOLE settings object (a missing key falls back to its default) and its
// zod schema (eshopSettingsBody) is .strict(): the body is the settings object
// GET returned — every key this page does not edit (maxMirrorAgeSeconds, a
// later phase's courier booking fields, …) goes back exactly as loaded — with the edited
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
  /** Test payments: a cash order counts as paid — the server allows it only where it is a test server. */
  testPayments: boolean
  /** When the order-confirmation e-mail goes out: after the Winmax document posts (default) or at payment. */
  confirmationEmail: 'afterWinmax' | 'atPayment'
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
  /** ACS and BOX NOW; null when the server returned no couriers block (then saved back without one). */
  couriers: EshopCouriersForm | null
  /** Every other key of the loaded settings (maxMirrorAgeSeconds, …). */
  kept: Kept
}

const SETTINGS_KEYS = [
  'enabled',
  'checkoutMode',
  'allowSplit',
  'testPayments',
  'confirmationEmail',
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
  'couriers',
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
    testPayments: src.testPayments === true,
    confirmationEmail: src.confirmationEmail === 'atPayment' ? 'atPayment' : 'afterWinmax',
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
    couriers: couriersFormOf(src.couriers),
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

  let couriers: Record<string, any> | undefined
  if (form.couriers) {
    const c = couriersPayloadOf(form.couriers, ctx.districts, t)
    errors.push(...c.errors)
    couriers = c.couriers
  }

  if (errors.length) return { payload: null, errors }
  return {
    payload: {
      ...form.kept,
      enabled: form.enabled === true,
      checkoutMode: form.checkoutMode === 'on' ? 'on' : 'off',
      allowSplit: form.allowSplit === true,
      testPayments: form.testPayments === true,
      confirmationEmail: form.confirmationEmail === 'atPayment' ? 'atPayment' : 'afterWinmax',
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
      ...(couriers ? { couriers } : {}),
    },
    errors,
  }
}

/* ------------------------------------------------------------ couriers (settings) */

/** A fee table's name, as PUT /eshop/rates/:outletId/:provider/:service takes it. */
export const SERVICE_NAME = /^[A-Za-z0-9_-]{1,20}$/

/** BOX NOW's locker sizes (the compartment a parcel is declared for). */
export const BOXNOW_SIZES = [1, 2, 3] as const
/** POW's BOX NOW contract: at most 20 kg and EUR 100 a parcel (settings may only lower them). */
export const BOXNOW_MAX_GRAMS = 20000
export const BOXNOW_MAX_VALUE = 100

export type EshopCouriersForm = {
  acs: { enabled: boolean; service: string; unsupportedDistricts: string[]; kept: Kept }
  /**
   * maxKg: the heaviest parcel in kg as typed (stored in grams); maxValue:
   * the most a parcel may be worth in euros as typed; compartmentSize: the
   * locker size parcels are booked in (1 small, 2 medium, 3 large);
   * anyApmOriginId: the "any locker" origin of POW's BOX NOW account.
   */
  boxnow: {
    enabled: boolean
    service: string
    maxKg: string
    maxValue: string
    compartmentSize: number
    anyApmOriginId: string
    kept: Kept
  }
  /** Every other key of the loaded couriers block. */
  kept: Kept
}

const COURIERS_KEYS = ['acs', 'boxnow']
const ACS_KEYS = ['enabled', 'service', 'unsupportedDistricts']
const BOXNOW_KEYS = ['enabled', 'service', 'maxGrams', 'maxParcelValue', 'compartmentSize', 'anyApmOriginId']

/** The form of the loaded `couriers` block; null when the server returned none (it has no courier settings). */
function couriersFormOf(c: unknown): EshopCouriersForm | null {
  if (!isPlainObject(c)) return null
  const acs = isPlainObject(c.acs) ? c.acs : {}
  const boxnow = isPlainObject(c.boxnow) ? c.boxnow : {}
  const maxGrams = finite(boxnow.maxGrams)
  const maxValue = finite(boxnow.maxParcelValue)
  const size = Number(boxnow.compartmentSize)
  return {
    acs: {
      enabled: acs.enabled === true,
      service: text(acs.service).trim() || 'D2D',
      // the server's default when absent; an explicit list (even empty) as given
      unsupportedDistricts: Array.isArray(acs.unsupportedDistricts)
        ? Array.from(new Set(list(acs.unsupportedDistricts).map((d) => d.trim())))
        : ['Keryneia'],
      kept: keptOf(acs, ACS_KEYS),
    },
    boxnow: {
      enabled: boxnow.enabled === true,
      service: text(boxnow.service).trim() || 'LOCKER',
      maxKg: gramsToKgText(
        maxGrams !== undefined && maxGrams > 0 ? Math.min(maxGrams, BOXNOW_MAX_GRAMS) : BOXNOW_MAX_GRAMS,
      ),
      maxValue: moneyText(
        maxValue !== undefined && maxValue > 0 ? Math.min(maxValue, BOXNOW_MAX_VALUE) : BOXNOW_MAX_VALUE,
      ),
      compartmentSize: (BOXNOW_SIZES as readonly number[]).includes(size) ? size : 2,
      anyApmOriginId: text(boxnow.anyApmOriginId).trim(),
      kept: keptOf(boxnow, BOXNOW_KEYS),
    },
    kept: keptOf(c, COURIERS_KEYS),
  }
}

/** The `couriers` of the PUT body (the loaded block with the edited keys replaced) and what is wrong with it. */
function couriersPayloadOf(
  c: EshopCouriersForm,
  districts: string[],
  t: Translate,
): { couriers: Record<string, any>; errors: string[] } {
  const errors: string[] = []
  const acsService = text(c.acs.service).trim()
  if (!SERVICE_NAME.test(acsService)) errors.push(t('eshop.settings.errors.acsService'))
  const chosen = new Set(c.acs.unsupportedDistricts.map((d) => text(d).trim()).filter(Boolean))
  // the page's district order, then any other name the server returned
  const unsupportedDistricts = [
    ...districts.filter((d) => chosen.has(d)),
    ...Array.from(chosen).filter((d) => !districts.includes(d)),
  ]
  if (unsupportedDistricts.length > 10 || unsupportedDistricts.some((d) => d.length > 40)) {
    errors.push(t('eshop.settings.errors.acsDistricts'))
  }
  const boxnowService = text(c.boxnow.service).trim()
  if (!SERVICE_NAME.test(boxnowService)) errors.push(t('eshop.settings.errors.boxnowService'))
  const maxGrams = kgTextToGrams(c.boxnow.maxKg)
  if (!(maxGrams >= 1 && maxGrams <= BOXNOW_MAX_GRAMS)) errors.push(t('eshop.settings.errors.boxnowMaxKg'))
  const maxParcelValue = moneyFromText(c.boxnow.maxValue)
  if (!(maxParcelValue > 0 && maxParcelValue <= BOXNOW_MAX_VALUE))
    errors.push(t('eshop.settings.errors.boxnowMaxValue'))
  const compartmentSize = (BOXNOW_SIZES as readonly number[]).includes(Number(c.boxnow.compartmentSize))
    ? Number(c.boxnow.compartmentSize)
    : 2
  const anyApmOriginId = text(c.boxnow.anyApmOriginId).trim()
  if (anyApmOriginId.length > 40) errors.push(t('eshop.settings.errors.boxnowOrigin'))
  return {
    couriers: {
      ...c.kept,
      acs: { ...c.acs.kept, enabled: c.acs.enabled === true, service: acsService, unsupportedDistricts },
      boxnow: {
        ...c.boxnow.kept,
        enabled: c.boxnow.enabled === true,
        service: boxnowService,
        maxGrams,
        maxParcelValue,
        compartmentSize,
        anyApmOriginId,
      },
    },
    errors,
  }
}

/* ------------------------------------------------------------ kg, euros, dates */

/** 2400 → "2.4" (kilograms, as typed back into a kg field); '' when not a number. */
export function gramsToKgText(grams: unknown): string {
  const n = Number(grams)
  if (grams === null || grams === undefined || grams === '' || !Number.isFinite(n)) return ''
  return String(Math.round(n) / 1000)
}

/** 2400 → "2.4 kg"; '' when not a number. */
export function formatKg(grams: unknown): string {
  const kg = gramsToKgText(grams)
  return kg ? `${kg} kg` : ''
}

/** "2,4" or "2.4" (kg, at most 3 decimals) → 2400 grams; NaN when it is not such a number. */
export function kgTextToGrams(v: unknown): number {
  const s = text(v).trim().replace(',', '.')
  return /^\d+(\.\d{1,3})?$/.test(s) ? Math.round(Number(s) * 1000) : NaN
}

/** "10,3" or "10.30" → 10.3; NaN unless an amount from 0 with at most 2 decimals. */
export function moneyFromText(v: unknown): number {
  const s = text(v).trim().replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : NaN
}

/** €4.70, -€4.70 (the sign before the euro sign); '' for none. */
export function formatMoney(v: unknown): string {
  const n = Number(v)
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return ''
  return `${n < 0 ? '-' : ''}€${Math.abs(n).toFixed(2)}`
}

/** 10.3 → "10.30" for an amount field; '' for none. */
export function moneyText(v: unknown): string {
  const n = Number(v)
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? '' : n.toFixed(2)
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** The value of a date field (YYYY-MM-DD) for a day. */
export function dateFieldValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** The local midnight starting a date field's day (`days` later), or null when the field is empty or not a date. */
export function dayStart(day: string, days = 0): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(day).trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days)
  return isNaN(d.getTime()) ? null : d
}

/* ------------------------------------------------------------ orders, holds */

/** Statuses of an order and of its fulfilments (orders.model ESHOP_ORDER_STATUSES). */
export const ESHOP_STATUSES = [
  'PendingPayment',
  'PaymentConfirmed',
  'Allocated',
  'Processing',
  'ReadyForPickup',
  'ReadyForDispatch',
  'Dispatched',
  'Completed',
  'Cancelled',
  'Exception',
]
export const PAYMENT_STATUSES = ['Pending', 'Successful', 'Failed', 'Cancelled', 'Expired', 'Refunded']
/** Stock hold statuses (eshopReservation.model). */
export const HOLD_STATUSES = ['pending', 'active', 'confirmed', 'consumed', 'released', 'expired']
const WINMAX_STATES = ['NotQueued', 'Queued', 'Sending', 'Sent', 'Failed', 'Skipped']
const STEP_TARGETS = ['Processing', 'ReadyForPickup', 'ReadyForDispatch', 'Dispatched', 'Completed', 'Exception']

/** A known code in words (`<prefix>.<code>`), else the code as it is ('—' for none). */
const known = (codes: string[], v: unknown, prefix: string, t: Translate): string => {
  const s = text(v).trim()
  return codes.includes(s) ? t(`${prefix}.${s}`) : s || '—'
}

export const eshopStatusText = (s: unknown, t: Translate) => known(ESHOP_STATUSES, s, 'eshop.common.eshopStatus', t)

export function eshopStatusColor(s: unknown): string {
  switch (text(s)) {
    case 'Completed':
      return 'success'
    case 'Exception':
      return 'danger'
    case 'ReadyForPickup':
    case 'ReadyForDispatch':
      return 'warning'
    case 'Processing':
    case 'Dispatched':
      return 'primary'
    case 'PaymentConfirmed':
    case 'Allocated':
      return 'info'
    default:
      return 'secondary'
  }
}

export const paymentStatusText = (s: unknown, t: Translate) =>
  known(PAYMENT_STATUSES, s, 'eshop.common.paymentStatus', t)

export function paymentStatusColor(s: unknown): string {
  switch (text(s)) {
    case 'Successful':
      return 'success'
    case 'Refunded':
      return 'info'
    case 'Pending':
      return 'warning'
    case 'Failed':
    case 'Expired':
      return 'danger'
    default:
      return 'secondary'
  }
}

export const holdStatusText = (s: unknown, t: Translate) => known(HOLD_STATUSES, s, 'eshop.common.holdStatus', t)

export function holdStatusColor(s: unknown): string {
  switch (text(s)) {
    case 'active':
      return 'warning'
    case 'confirmed':
      return 'info'
    case 'consumed':
      return 'success'
    case 'pending':
      return 'primary'
    default:
      return 'secondary'
  }
}

export const winmaxStateText = (s: unknown, t: Translate) => known(WINMAX_STATES, s, 'eshop.common.winmax', t)

export function winmaxStateColor(s: unknown): string {
  switch (text(s)) {
    case 'Sent':
      return 'success'
    case 'Failed':
      return 'danger'
    case 'Queued':
    case 'Sending':
      return 'info'
    default:
      return 'secondary'
  }
}

/** The customer's choice: delivery, pickup, digital. */
export const methodText = (m: unknown, t: Translate) =>
  known(['delivery', 'pickup', 'digital'], m, 'eshop.common.method', t)

/** How one shop's part goes out: pickup, courier, digital. */
export const fulfilmentMethodText = (m: unknown, t: Translate) =>
  known(['pickup', 'courier', 'digital'], m, 'eshop.common.fulfilmentMethod', t)

/** acs → ACS, boxnow → BOX NOW; none → '—'. */
export const providerText = (p: unknown, t: Translate) => known(['acs', 'boxnow'], p, 'eshop.common.provider', t)

/** An order Exception's code (set by the payment path) in one plain line; '' for a code this page does not know. */
export function exceptionCodeText(code: unknown, t: Translate): string {
  const c = text(code).trim()
  return [
    'LATE_PAYMENT_NO_STOCK',
    'PAID_AFTER_CANCEL',
    'HOLD_NOT_CONFIRMED',
    'CONFIRM_FAILED',
    'UNVERIFIED_PAYMENT',
  ].includes(c)
    ? t(`eshop.orders.exception.codes.${c}`)
    : ''
}

/** The label of a step button (a status of the fulfilment's `next` list). */
export function stepLabel(to: string, from: string, t: Translate): string {
  if (to === 'Processing' && from === 'Exception') return t('eshop.orders.steps.ProcessingAgain')
  return known(STEP_TARGETS, to, 'eshop.orders.steps', t)
}

/** What a step means, for its confirm dialog. */
export function stepHelp(to: string, from: string, method: string, t: Translate): string {
  if (to === 'Processing' && from === 'Exception') return t('eshop.orders.stepHelp.ProcessingAgain')
  if (to === 'Completed') {
    if (method === 'pickup') return t('eshop.orders.stepHelp.CompletedPickup')
    if (method === 'courier') return t('eshop.orders.stepHelp.CompletedCourier')
    return t('eshop.orders.stepHelp.Completed')
  }
  return STEP_TARGETS.includes(to) ? t(`eshop.orders.stepHelp.${to}`) : ''
}

const HOLD_REASON_KEYS: Record<string, string> = {
  expired: 'expired',
  'stale-pending': 'stalePending',
  'retry-lost': 'retryLost',
  'retry-order-changed': 'retryOrderChanged',
  'replaced-by-new-checkout': 'replaced',
  superseded: 'superseded',
  'order-cancelled': 'orderCancelled',
}

/** Why a stock hold ended (eshopCheckout releaseReservation) in plain words; other reasons as they are. */
export function holdReasonText(reason: unknown, t: Translate): string {
  const r = text(reason).trim()
  if (!r) return ''
  if (r.startsWith('conflict:')) return t('eshop.holds.reasons.conflict', { code: r.slice('conflict:'.length) })
  const key = HOLD_REASON_KEYS[r]
  return key ? t(`eshop.holds.reasons.${key}`) : r
}

export type EshopShopLite = { zoneId: string; displayName: string; warehouseCode: number; active: boolean }

/** The e-shop's shops as stored on the navbar's outlet document (outlet.eshopFulfilment.shops). */
export function eshopShopsOf(outlet: any): EshopShopLite[] {
  const shops = outlet?.eshopFulfilment?.shops
  return (Array.isArray(shops) ? shops : [])
    .filter((s: any) => HEX24.test(text(s?.zoneId)))
    .map((s: any) => ({
      zoneId: text(s.zoneId).toLowerCase(),
      displayName: text(s.displayName).trim(),
      warehouseCode: Number(s.warehouseCode) || 0,
      active: s.active !== false,
    }))
}

/* ------------------------------------------------------------ courier fee tables */

/** The tables this panel edits: ACS door to door, BOX NOW lockers. */
export const RATE_TABLES: Array<{ provider: 'acs' | 'boxnow'; service: string }> = [
  { provider: 'acs', service: 'D2D' },
  { provider: 'boxnow', service: 'LOCKER' },
]

export type RateBandRow = { upToKg: string; customer: string; cost: string }

/** A fee table as typed: kilograms and euros as text. */
export type RateForm = { bands: RateBandRow[]; perKgCustomer: string; perKgCost: string; maxKg: string }

/** The form of a table of GET /eshop/rates/:outletId (null: none yet). */
export function rateFormFromTable(table: any): RateForm {
  const bands = Array.isArray(table?.bands) ? table.bands : []
  return {
    bands: bands.map((b: any) => ({
      upToKg: gramsToKgText(b?.upToGrams),
      customer: moneyText(b?.customerPrice),
      cost: moneyText(b?.costPrice),
    })),
    perKgCustomer: moneyText(table?.overflow?.perKgCustomer),
    perKgCost: moneyText(table?.overflow?.perKgCost),
    maxKg: gramsToKgText(table?.maxGrams),
  }
}

/**
 * The body of PUT /eshop/rates/:outletId/:provider/:service (bands lightest
 * first) and what is wrong with the form; the body is null while anything
 * is. The server checks the table again (courierRates.math validateRateTable).
 */
export function ratePayloadFromForm(
  form: RateForm,
  t: Translate,
): { payload: Record<string, any> | null; errors: string[] } {
  const errors: string[] = []
  if (!form.bands.length) errors.push(t('eshop.rates.errors.noBands'))
  if (form.bands.length > 200) errors.push(t('eshop.rates.errors.tooManyBands'))
  const bands = form.bands.map((b, i) => {
    const n = i + 1
    const upToGrams = kgTextToGrams(b.upToKg)
    if (!(upToGrams >= 1 && upToGrams <= 1000000)) errors.push(t('eshop.rates.errors.bandWeight', { n }))
    const customerPrice = moneyFromText(b.customer)
    if (!(customerPrice >= 0 && customerPrice <= 10000)) errors.push(t('eshop.rates.errors.bandCustomer', { n }))
    const costText = text(b.cost).trim()
    const costPrice = costText === '' ? null : moneyFromText(costText)
    if (costPrice !== null && !(costPrice >= 0 && costPrice <= 10000)) {
      errors.push(t('eshop.rates.errors.bandCost', { n }))
    }
    return { upToGrams, customerPrice, costPrice }
  })
  const seen = new Set<number>()
  for (const b of bands) {
    if (!(b.upToGrams >= 1)) continue
    if (seen.has(b.upToGrams)) errors.push(t('eshop.rates.errors.bandTwice', { kg: gramsToKgText(b.upToGrams) }))
    seen.add(b.upToGrams)
  }
  const perKgCustomerText = text(form.perKgCustomer).trim()
  const perKgCustomer = perKgCustomerText === '' ? 0 : moneyFromText(perKgCustomerText)
  if (!(perKgCustomer >= 0 && perKgCustomer <= 1000)) errors.push(t('eshop.rates.errors.perKgCustomer'))
  const perKgCostText = text(form.perKgCost).trim()
  const perKgCost = perKgCostText === '' ? null : moneyFromText(perKgCostText)
  if (perKgCost !== null && !(perKgCost >= 0 && perKgCost <= 1000)) errors.push(t('eshop.rates.errors.perKgCost'))
  const maxGrams = kgTextToGrams(form.maxKg)
  const heaviest = Math.max(0, ...bands.map((b) => (b.upToGrams >= 1 ? b.upToGrams : 0)))
  if (!(maxGrams >= 1 && maxGrams <= 1000000)) errors.push(t('eshop.rates.errors.maxKg'))
  else if (maxGrams < heaviest) errors.push(t('eshop.rates.errors.maxBelowBand'))
  if (errors.length) return { payload: null, errors }
  return {
    payload: {
      bands: [...bands].sort((a, b) => a.upToGrams - b.upToGrams),
      overflow: { perKgCustomer, perKgCost },
      maxGrams,
    },
    errors,
  }
}

/** One price of POST /eshop/rates/:outletId/preview (customer or cost) in words. */
export function priceResultText(r: any, t: Translate): string {
  if (r?.ok) return formatPrice(r.amount)
  const code = text(r?.code)
  return ['NO_TARIFF', 'TOO_HEAVY', 'INVALID_WEIGHT'].includes(code)
    ? t(`eshop.rates.preview.codes.${code}`)
    : code || '—'
}
