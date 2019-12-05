// ==UserScript==
// @name         Tubi TV
// @description  Transfer video stream to player on WebCast-Reloaded external website.
// @version      0.1.0
// @match        *://tubitv.com/*
// @icon         https://tubitv.com/favicon.ico
// @run-at       document-idle
// @homepage     https://github.com/warren-bank/crx-Tubi-TV
// @supportURL   https://github.com/warren-bank/crx-Tubi-TV/issues
// @downloadURL  https://github.com/warren-bank/crx-Tubi-TV/raw/greasemonkey-userscript/greasemonkey-userscript/Tubi-TV.user.js
// @updateURL    https://github.com/warren-bank/crx-Tubi-TV/raw/greasemonkey-userscript/greasemonkey-userscript/Tubi-TV.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// https://www.chromium.org/developers/design-documents/user-scripts

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

var inject_payload = function(){
  var inline, script, head

  inline = document.createTextNode(
    '(' + payload.toString() + ')()'
  )

  script = document.createElement('script')
  script.appendChild(inline)

  head = document.getElementsByTagName('head')[0]
  head.appendChild(script)
}

if (document.readyState === 'complete'){
  inject_payload()
}
else {
  document.onreadystatechange = function(){
    if (document.readyState === 'complete'){
      inject_payload()
    }
  }
}
