function isInteger(value) {
  return Number.isInteger(value) && Number.isFinite(value)
}

export function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null }
  }

  if (typeof value === 'string') {
    return { stringValue: value }
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value }
  }

  if (typeof value === 'number') {
    return isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() }
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => toFirestoreValue(entry)),
      },
    }
  }

  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(value),
      },
    }
  }

  return { stringValue: String(value) }
}

export function toFirestoreFields(data) {
  return Object.entries(data).reduce((fields, [key, value]) => {
    if (value !== undefined) {
      fields[key] = toFirestoreValue(value)
    }

    return fields
  }, {})
}

export function fromFirestoreValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map((entry) => fromFirestoreValue(entry))
  }
  if ('mapValue' in value) {
    return fromFirestoreFields(value.mapValue.fields ?? {})
  }
  return null
}

export function fromFirestoreFields(fields = {}) {
  return Object.entries(fields).reduce((result, [key, value]) => {
    result[key] = fromFirestoreValue(value)
    return result
  }, {})
}
