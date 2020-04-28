import applyURL from './applyURL'
import { push, replace, historyIsSupported } from './urlManager'

let cancelLastRequest

function navigate(options) {
  options = options || {}

  if (cancelLastRequest) {
    cancelLastRequest()
  }

  let responseURL
  let removeListeners
  const controller = new AbortController()
  cancelLastRequest = () => controller.abort()

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort()
    } else {
      const { signal } = options
      removeListeners = () => {
        controller.signal.removeEventListener('abort', removeListeners)
        signal.removeEventListener('abort', whenAborted)
      }

      const whenAborted = () => {
        removeListeners()
        controller.abort()
      }

      controller.signal.addEventListener('abort', removeListeners)
      signal.addEventListener('abort', whenAborted)
    }
  }

  return applyURL(Object.assign({}, options, {
    headers: Object.assign({
      'X-Navigation': 'true',
    }, options.headers || {}),

    prefix: options.prefix || 'nav-',
    signal: controller.signal,

    afterResponse: (e) => {
      responseURL = e.detail.responseURL

      if (
        historyIsSupported() &&
        responseURL != location.href
      ) {
        if (options.replace) {
          replace(responseURL)
        } else {
          push(responseURL)
        }
      }

      if (typeof options.afterResponse == 'function') {
        options.afterResponse(e)
      }
    },

    afterLoad: (e) => {
      if (location.hash) {
        location.hash = location.hash
      }

      if (typeof options.afterLoad == 'function') {
        options.afterLoad(e)
      }
    },

    afterDone: (e) => {
      cancelLastRequest = null
      if (removeListeners) {
        removeListeners()
      }

      if (typeof options.afterDone == 'function') {
        options.afterDone(e)
      }
    },

    afterError: (e) => {
      if (responseURL) {
        location.href = responseURL
      } else {
        location.href = options.url || location.href
      }

      if (typeof options.afterError == 'function') {
        options.afterError(e)
      }
    },
  }))
}

export function abortNavigation() {
  if (cancelLastRequest) {
    cancelLastRequest()
  }
}

export default navigate
