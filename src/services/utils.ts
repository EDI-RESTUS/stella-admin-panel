export const sleep = (ms = 0) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Validation */
export const validators = {
  email: (v: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(v) || 'Please enter a valid email address'
  },
  required: (v: any) => !!v || 'This field is required',
}

export function removeNulls(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => removeNulls(item)).filter((item) => item !== null && item !== undefined)
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const cleanedValue = removeNulls(value)
      if (
        cleanedValue !== null &&
        cleanedValue !== undefined &&
        !(typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0)
      ) {
        acc[key] = cleanedValue
      }
      return acc
    }, {})
  }
  return obj
}
