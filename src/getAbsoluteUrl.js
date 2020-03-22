// From https://davidwalsh.name/get-absolute-url

var a
export default function(url) {
  if (!a) a = document.createElement('a')
  a.href = url

  return a.href
}
