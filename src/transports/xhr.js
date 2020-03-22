import { apply } from 'jwit'
import getAbsoluteUrl from '../getAbsoluteUrl'

export default ({
  onDownloadProgress,
  onUploadProgress,
  onError,
  onDone,
  onLoad,
  onResponse,
  method,
  url,
  headers,
  body,
  fragment,
}) => {
  let xhr = new XMLHttpRequest()

  xhr.onprogress = function({ loaded, total }) {
    onDownloadProgress({ loaded, total })
  }

  if (xhr.upload) {
    xhr.upload.onprogress = function({ loaded, total }) {
      onUploadProgress({ loaded, total })
    }
  }

  xhr.onload = function() {
    var delta, responseURL

    try {
      delta = JSON.parse(xhr.responseText)
    } catch (error) {
      xhr = null
      onError({ error })
      onDone({ error })
      return
    }

    responseURL = xhr.responseURL || xhr.getResponseHeader('X-Response-Url') || url
    if (responseURL.indexOf('#') == -1) {
      responseURL += fragment
    }

    xhr = null
    responseURL = getAbsoluteUrl(responseURL)
    onResponse({ responseURL })

    function afterApply() {
      onLoad({ responseURL })
      onDone({ responseURL })
    }

    const done = apply(delta, afterApply)
    if (done) {
      afterApply()
    }
  }

  xhr.onerror = function(error) {
    xhr = null
    onError({ error })
    onDone({ error })
  }

  xhr.open(method, url, true)

  for (let i in headers) if (headers.hasOwnProperty(i)) {
    xhr.setRequestHeader(i, headers[i])
  }

  xhr.send(body)

  return () => {
    if (xhr) {
      xhr.onload = xhr.onerror = null
      xhr.abort()
      xhr = null
    }
  }
}
