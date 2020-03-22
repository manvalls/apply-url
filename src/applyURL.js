import { queueMutex } from 'jwit'
import getAbsoluteUrl from './getAbsoluteUrl'
import { assign, dedupe, toQuery } from './util'

import triggerEvent from './triggerEvent'
import xhrTransport from './transports/xhr'
import wsTransport from './transports/ws'

const queue = (fn) => {
  let aborted = false

  const unlocker = queueMutex.lock((unlocker) => {
    if (aborted) {
      return
    }

    fn(unlocker)
  })

  if (unlocker) {
    fn(unlocker)
  }

  return () => {
    aborted = true
  }
}

function applyURL(options) {
  var url, wsUrl, wsEvents, fragment, method, headers, body, target, signal

  options = options || {}

  url = options.url || location.href
  fragment = (url.match(/#.*$/) || [''])[0]
  url = url.replace(/#.*$/, '')
  url = getAbsoluteUrl(url)

  method = options.method || 'GET'
  headers = options.headers || {}
  body = options.body || null
  target = options.target || null
  signal = options.signal || null
  wsEvents = options.wsEvents || null

  wsUrl = options.wsUrl || null
  if (wsUrl) {
    wsUrl = getAbsoluteUrl(wsUrl).replace(/^http/, 'ws')
  }

  const requestId = Math.random().toString(36).slice(-10) +
                    Math.random().toString(36).slice(-10) +
                    Date.now().toString(36)

  let resolve = () => {}
  let reject = () => {}
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  const baseEventData = { url, wsUrl, method, headers, body, target, requestId }

  const onDone = (data) => {
    triggerEvent('done', options, assign(data, baseEventData))
  }

  const onAbort = (data) => {
    triggerEvent('abort', options, assign(data, baseEventData))
  }

  const onLoading = (data) => {
    triggerEvent('loading', options, assign(data, baseEventData))
  }

  const onLoad = (data) => {
    const result = assign(data, baseEventData)
    resolve(result)
    triggerEvent('load', options, result)
  }

  const onError = (data) => {
    reject(data.error)
    triggerEvent('error', options, assign(data, baseEventData))
  }

  const onResponse = (data) => {
    triggerEvent('response', options, assign(data, baseEventData))
  }

  const onUploadProgress = (data) => {
    triggerEvent('uploadProgress', options, assign(data, baseEventData))
  }

  const onDownloadProgress = (data) => {
    triggerEvent('downloadProgress', options, assign(data, baseEventData))
  }

  let abortReq

  const unqueue = queue(qcb => {
    var i

    try {
      const computedHeaders = {}

      computedHeaders['accept'] = 'application/json'
      computedHeaders['x-request-id'] = requestId
      computedHeaders['x-requested-with'] = 'XMLHttpRequest'

      if (typeof _SH !== 'undefined') {
        const addHeaders = (_SH) => {
          var i

          for (i in _SH) if (_SH.hasOwnProperty(i) && _SH[i] != null) {
            if (typeof _SH[i] == 'string') {
              computedHeaders[i.toLowerCase()] = _SH[i]
            } else if (_SH[i] instanceof Array) {
              _SH[i] = dedupe(_SH[i])
              computedHeaders[i.toLowerCase()] = _SH[i].join(', ')
            } else if (_SH[i].hasOwnProperty('_map') && _SH[i]._map === true) {
              computedHeaders[i.toLowerCase()] = toQuery(_SH[i])
            } else {
              addHeaders(_SH[i])
            }
          }
        }

        addHeaders(window._SH)
      }

      for (i in headers) if (headers.hasOwnProperty(i)) {
        computedHeaders[i] = headers[i]
      }

      onLoading({})

      if (wsUrl) {
        abortReq = wsTransport({
          onDownloadProgress,
          onUploadProgress,
          onError,
          onDone,
          onLoad,
          onResponse,
          method,
          url,
          wsUrl,
          wsEvents,
          headers: computedHeaders,
          body,
          fragment,
        })
      } else {
        abortReq = xhrTransport({
          onDownloadProgress,
          onUploadProgress,
          onError,
          onDone,
          onLoad,
          onResponse,
          method,
          url,
          headers: computedHeaders,
          body,
          fragment,
        })
      }
    } catch (error) {
      onError({ error })
      onDone({ error })
    }

    qcb()
  })

  if (signal) {
    let isAborted = false

    const abort = () => {
      if (isAborted) {
        return
      }

      isAborted = true
      unqueue()

      if (abortReq) {
        abortReq()
        abortReq = null
      }

      onAbort({})
      onDone({})
    }

    if (signal.aborted) {
      abort()
    } else {
      signal.addEventListener('abort', abort)
      if (promise) {
        promise.then(() => {
          signal.removeEventListener('abort', abort)
        })
      }
    }
  }

  return promise
}

export default applyURL
