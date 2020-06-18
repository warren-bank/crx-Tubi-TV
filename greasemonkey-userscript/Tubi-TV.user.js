// ==UserScript==
// @name         Tubi TV
// @description  Transfers video stream to alternate video players: WebCast-Reloaded, ExoAirPlayer.
// @version      0.3.1
// @match        *://tubitv.com/*
// @icon         https://tubitv.com/favicon.ico
// @run-at       document-idle
// @homepage     https://github.com/warren-bank/crx-Tubi-TV/tree/greasemonkey-userscript
// @supportURL   https://github.com/warren-bank/crx-Tubi-TV/issues
// @downloadURL  https://github.com/warren-bank/crx-Tubi-TV/raw/greasemonkey-userscript/greasemonkey-userscript/Tubi-TV.user.js
// @updateURL    https://github.com/warren-bank/crx-Tubi-TV/raw/greasemonkey-userscript/greasemonkey-userscript/Tubi-TV.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// https://www.chromium.org/developers/design-documents/user-scripts

var user_options = {
  "script_injection_delay_ms":    0,
  "redirect_to_webcast_reloaded": true,
  "force_http":                   true,
  "force_https":                  false
}

var payload = function(){
  // ===========================================================================

  const get_referer_url = function() {
    let referer_url
    try {
      referer_url = top.location.href
    }
    catch(e) {
      referer_url = window.location.href
    }
    return referer_url
  }

  const get_webcast_reloaded_url = (hls_url, vtt_url, referer_url) => {
    let encoded_hls_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

    encoded_hls_url       = encodeURIComponent(encodeURIComponent(btoa(hls_url)))
    encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
    referer_url           = referer_url ? referer_url : get_referer_url()
    encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

    webcast_reloaded_base = {
      "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
      "http":  "http://webcast-reloaded.surge.sh/index.html"
    }

    webcast_reloaded_base = (window.force_http)
                              ? webcast_reloaded_base.http
                              : (window.force_https)
                                 ? webcast_reloaded_base.https
                                 : (hls_url.toLowerCase().indexOf('http:') === 0)
                                    ? webcast_reloaded_base.http
                                    : webcast_reloaded_base.https

    webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_hls_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
    return webcast_reloaded_url
  }

  const redirect_to_url = function(url) {
    if (!url) return

    try {
      top.location = url
    }
    catch(e) {
      window.location = url
    }
  }

  const process_video_url = (hls_url) => {
    if (hls_url && window.redirect_to_webcast_reloaded) {
      // transfer video stream

      redirect_to_url(get_webcast_reloaded_url(hls_url))
    }
  }

  // ===========================================================================

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

  // ===========================================================================

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

var inject_options = function(){
  var _function = `function(){
    window.redirect_to_webcast_reloaded = ${user_options['redirect_to_webcast_reloaded']}
    window.force_http                   = ${user_options['force_http']}
    window.force_https                  = ${user_options['force_https']}
  }`
  inject_function(_function)
}

var bootstrap = function(){
  inject_options()
  inject_function(payload)
}

if (user_options['redirect_to_webcast_reloaded']){
  setTimeout(
    bootstrap,
    user_options['script_injection_delay_ms']
  )
}
