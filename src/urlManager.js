import { queue } from 'jwit'
import navigate from './navigate'

let session

try {
  session = window.sessionStorage || {}
} catch (err) {
  session = {}
}

function recordScroll() {
  if (!window.__currentUMStamp) {
    return
  }

  session['__UMStamp_' + window.__currentUMStamp] = JSON.stringify({
    top: document.documentElement.scrollTop || document.body.scrollTop || 0,
    left: document.documentElement.scrollLeft || document.body.scrollLeft || 0,
  })
}

export function historyIsSupported() {
  return typeof history != 'undefined' &&
    history.pushState && history.replaceState &&
    window.addEventListener
}

export function push(url) {
  recordScroll()
  window.__currentUMStamp = getStamp()
  history.pushState({ __UMStamp: window.__currentUMStamp }, '', url)
}

export function replace(url) {
  const s = history.state || {}
  window.__currentUMStamp = s.__UMStamp = s.__UMStamp || getStamp()
  history.replaceState(s, '', url)
}

function getStamp() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(-5)
}

function getRecordedScroll() {
  try {
    return JSON.parse(session['__UMStamp_' + history.state.__UMStamp])
  } catch (err) { }
}

function scroll(s) {
  if (!s) {
    return
  }

  window.scrollTo(s.left, s.top)
}

function onPopState() {
  let s

  if (history.state && history.state.__UMStamp && history.state.__UMStamp != window.__currentUMStamp) {
    s = getRecordedScroll()
  }

  recordScroll()
  replace(location.href)

  navigate({
    replace: true,
    target: document.querySelector('[data-popstate-target]') || document.querySelector(`[href=${location.href}]`),
    prefix: 'popstate-',
    headers: { 'X-Popstate': 'true' },
    cancelableLoad: true,
    afterLoad: (e) => {
      if (!e.defaultPrevented) {
        scroll(s)
      }
    },
  })
}

export function bindPopState() {
  if (historyIsSupported() && !window.__URLManagerStarted) {
    window.__URLManagerStarted = true
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    if (document.readyState == 'complete') {
      window.addEventListener('popstate', onPopState, false)
    } else {
      window.addEventListener('load', function init() {
        window.removeEventListener('load', init, false)
        setTimeout(() => {
          window.addEventListener('popstate', onPopState, false)
        }, 0)
      }, false)
    }

    function handleExternalChange() {
      replace(location.href)
      recordScroll()
    }

    window.addEventListener('hashchange', () => {
      setTimeout(handleExternalChange, 0)
    }, false)

    window.addEventListener('unload', handleExternalChange, false)

    replace(location.href)
    queue(cb => {
      scroll(getRecordedScroll())
      cb()
    })
  }
}
