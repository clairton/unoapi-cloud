export default (value) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(value)
  } else {
    const el = document.createElement('textarea')
    el.value = value
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    el.setSelectionRange(0, 99999)
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}
