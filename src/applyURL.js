import { dedupe, toQuery, queue } from './util'
import createLink from 'create-link'

import triggerEvent from './triggerEvent'
import xhrTransport from './transports/xhr'
import wsTransport from './transports/ws'

function applyURL(options) {
  var url, wsUrl, wsEvents, fragment, method, headers, body, target, signal

  options = options || {}

  url = options.url || location.href
  fragment = (url.match(/#.*$/) || [''])[0]
  url = url.replace(/#.*$/, '')
  url = createLink(url).href

  method = options.method || 'GET'
  headers = options.headers || {}
  body = options.body || null
  target = options.target || null
  signal = options.signal || null
  wsEvents = options.wsEvents || null

  wsUrl = options.wsUrl || null
  if (wsUrl) {
    wsUrl = createLink(wsUrl).href.replace(/^http/, 'ws')
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
    triggerEvent('done', options, Object.assign(data, baseEventData))
  }

  const onAbort = (data) => {
    triggerEvent('abort', options, Object.assign(data, baseEventData))
  }

  const onLoading = (data) => {
    triggerEvent('loading', options, Object.assign(data, baseEventData))
  }

  const onLoad = (data) => {
    const result = Object.assign(data, baseEventData)
    resolve(result)
    triggerEvent('load', options, result)
  }

  const onError = (data) => {
    reject(data.error)
    triggerEvent('error', options, Object.assign(data, baseEventData))
  }

  const onResponse = (data) => {
    triggerEvent('response', options, Object.assign(data, baseEventData))
  }

  const onUploadProgress = (data) => {
    triggerEvent('uploadProgress', options, Object.assign(data, baseEventData))
  }

  const onDownloadProgress = (data) => {
    triggerEvent('downloadProgress', options, Object.assign(data, baseEventData))
  }

  let abortReq

  const unqueue = queue(qcb => {
    var i

    try {
      const computedHeaders = {}

      computedHeaders['accept'] = 'application/json'
      computedHeaders['x-request-id'] = requestId
      computedHeaders['x-requested-with'] = 'XMLHttpRequest'

      if (typeof SPASessionHeadersMap !== 'undefined') {
        const addHeaders = (headers) => {
          var i

          for (i in headers) if (headers.hasOwnProperty(i) && headers[i] != null) {
            if (typeof headers[i] == 'string') {
              computedHeaders[i.toLowerCase()] = headers[i]
            } else if (headers[i] instanceof Array) {
              headers[i] = dedupe(headers[i])
              computedHeaders[i.toLowerCase()] = headers[i].join(', ')
            } else if (headers[i].hasOwnProperty('_map') && headers[i]._map === true) {
              computedHeaders[i.toLowerCase()] = toQuery(headers[i])
            } else {
              addHeaders(headers[i])
            }
          }
        }

        addHeaders(window.SPASessionHeadersMap)
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
