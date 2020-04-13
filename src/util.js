
export function dedupe(array) {
  const result = []

  for (let i = 0;i < array.length;i++) {
    const elem = array[i]
    if (result.indexOf(elem) == -1) {
      result.push(elem)
    }
  }

  return result
}

export function toQuery(context) {
  const attrs = []

  for (let key in context) if (key.indexOf('_') != 0 && context.hasOwnProperty(key)) {
    const values = context[key] instanceof Array ? context[key] : [context[key]]

    for (let i = 0;i < values.length;i++) {
      const value = values[i]
      attrs.push(encodeURIComponent(key) + (value ? '=' + encodeURIComponent(value) : ''))
    }
  }

  return attrs.join('&')
}

export function utf8Bytes(string) {
  let total = 0

  for (let i = 0;i < string.length;i++) {
    const code = string.charCodeAt(i)

    if (code <= 0x7f) {
      total++
    } else if (code <= 0x7ff) {
      total += 2
    } else if (code <= 0xffff) {
      total += 3
    } else if (code <= 0x1fffff) {
      total += 4
    } else if (code <= 0x3ffffff) {
      total += 5
    } else {
      total += 6
    }
  }

  return total
}
