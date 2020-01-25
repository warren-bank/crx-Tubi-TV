var payload = function(){
  const process_video_url = (hls_url) => {
    let encoded_hls_url, webcast_reloaded_base, webcast_reloaded_url

    encoded_hls_url       = encodeURIComponent(encodeURIComponent(btoa(hls_url)))
    webcast_reloaded_base = {
      "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html#/watch/",
      "http":  "http://gitcdn.link/cdn/warren-bank/crx-webcast-reloaded/gh-pages/external_website/index.html#/watch/"
    }
    webcast_reloaded_base = (hls_url.toLowerCase().indexOf('https:') === 0)
                              ? webcast_reloaded_base.https
                              : webcast_reloaded_base.http
    webcast_reloaded_url  = webcast_reloaded_base + encoded_hls_url

    top.location = webcast_reloaded_url
  }

  const process_data = (data) => {
    if (!data || !(data instanceof Object))
      return

    const keys = Object.keys(data.video.statusById)
    let key, video

    for (key of keys) {
      try {
        video = data.video.byId[key]
    
        const url = video.url
        if (url) {
          process_video_url(url)
          break
        }
      }
      catch(e) {}
    }
  }

  const process_scripts = (tags) => {
    const prefix = 'window.__data='
    const postfix = /;$/
    let tag, text

    if (!tags || !tags.length)
      return

    for (tag of tags) {
      try {
        text = tag.innerText.trim().replace(postfix, '')

        if (text.indexOf(prefix) === 0) {
          try {
            text = text.substr(prefix.length)

            // fix JSON
            text = text.replace(/(":)undefined([,}\]])/g, '$1null$2')

            const data = JSON.parse(text)
            process_data(data)
          }
          catch(e) {break}
        }
      }
      catch(e) {}
    }
  }

  const process_page = () => {
    if (window.__data)
      process_data(window.__data)
    else
      process_scripts([...document.querySelectorAll('script[charset]')])
  }

  process_page()
}

var get_hash_code = function(str){
  var hash, i, char
  hash = 0
  if (str.length == 0) {
    return hash
  }
  for (i = 0; i < str.length; i++) {
    char = str.charCodeAt(i)
    hash = ((hash<<5)-hash)+char
    hash = hash & hash  // Convert to 32bit integer
  }
  return Math.abs(hash)
}

var inject_function = function(_function){
  var inline, script, head

  inline = _function.toString()
  inline = '(' + inline + ')()' + '; //# sourceURL=crx_extension.' + get_hash_code(inline)
  inline = document.createTextNode(inline)

  script = document.createElement('script')
  script.appendChild(inline)

  head = document.head
  head.appendChild(script)
}

if (document.readyState === 'complete'){
  inject_function(payload)
}
else {
  document.addEventListener("DOMContentLoaded", function(event) {
    inject_function(payload)
  })
}
