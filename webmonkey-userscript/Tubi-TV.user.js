// ==UserScript==
// @name         Tubi TV
// @description  Watch videos in external player.
// @version      1.0.0
// @match        *://tubitv.com/*
// @match        *://*.tubitv.com/*
// @match        *://tubi.tv/*
// @match        *://*.tubi.tv/*
// @icon         https://tubitv.com/favicon.ico
// @run-at       document-end
// @homepage     https://github.com/warren-bank/crx-Tubi-TV/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-Tubi-TV/issues
// @downloadURL  https://github.com/warren-bank/crx-Tubi-TV/raw/webmonkey-userscript/es5/webmonkey-userscript/Tubi-TV.user.js
// @updateURL    https://github.com/warren-bank/crx-Tubi-TV/raw/webmonkey-userscript/es5/webmonkey-userscript/Tubi-TV.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "redirect_to_webcast_reloaded": true,
  "force_http":                   true,
  "force_https":                  false
}

var constants = {
  "captions_preferred_language":  "english"
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : unsafeWindow.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if ((url[0] === '/') && (typeof GM_resolveUrl === 'function'))
      url = GM_resolveUrl(url, unsafeWindow.location.href)
    if (url.indexOf('http') === 0)
      GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.location = url
    }
  }
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url) {
  if (!referer_url)
    referer_url = unsafeWindow.location.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }

    GM_startIntent.apply(this, args)
    return true
  }
  else if (user_options.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url)
}

var process_dash_url = function(dash_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url)
}

// ----------------------------------------------------------------------------- process video data

var process_data = function(data) {
  if (
    !data                  || (typeof data                  !== 'object') ||
    !data.video            || (typeof data.video            !== 'object') ||
    !data.video.statusById || (typeof data.video.statusById !== 'object')
  ) return

  var keys = Object.keys(data.video.statusById)
  var key, video, video_url, vtt_url

  for (var i=0; i < keys.length; i++) {
    key = keys[i]

    try {
      video = data.video.byId[key]

      video_url = video.url
      if (video_url) {
        vtt_url = (video.subtitles && Array.isArray(video.subtitles) && video.subtitles.length)
          ? (video.subtitles.length === 1)
              ? video.subtitles[0].url
              : (function() {
                  var preferred_lang, preferred_subtitles
                  preferred_lang = (typeof constants.captions_preferred_language === 'string')
                    ? constants.captions_preferred_language.toLowerCase()
                    : null
                  preferred_subtitles = (preferred_lang)
                    ? video.subtitles.filter(function(obj) { return (obj.url && (typeof obj.lang === 'string') && (obj.lang.toLowerCase().indexOf(preferred_lang) >= 0)) })
                    : []
                  return (preferred_subtitles.length)
                    ? preferred_subtitles[0].url
                    : video.subtitles[0].url
                })()
          : null

        process_hls_url(video_url, vtt_url)
        break
      }
    }
    catch(e) {}
  }
}

var inspect_scripts = function(tags) {
  var tags    = unsafeWindow.document.querySelectorAll('script[charset]')
  var prefix  = 'window.__data='
  var postfix = /;$/
  var tag, text, data

  if (!tags || !tags.length)
    return

  for (var i=0; i < tags.length; i++) {
    tag = tags[i]

    try {
      text = tag.innerText.trim().replace(postfix, '')

      if (text.indexOf(prefix) === 0) {
        try {
          text = text.substr(prefix.length)

          // fix JSON
          text = text.replace(/(":)undefined([,}\]])/g, '$1null$2')

          data = JSON.parse(text)
          process_data(data)
        }
        catch(e) {break}
      }
    }
    catch(e) {}
  }
}

// ----------------------------------------------------------------------------- bootstrap

var follow_all_links = function() {
  unsafeWindow.document.addEventListener('click', function(event){
    var anchor = event.target
    var depth  = 5

    while ((!(anchor instanceof HTMLAnchorElement)) && anchor.parentNode && (depth >= 0)) {
      depth--
      anchor = anchor.parentNode
    }

    if (anchor instanceof HTMLAnchorElement) {
      redirect_to_url(
        anchor.getAttribute('href')
      )
    }
  })
}

var init = function() {
  if (typeof GM_getUrl === 'function')
    if (GM_getUrl() !== unsafeWindow.location.href)
      return

  follow_all_links()

  if (unsafeWindow.__data)
    process_data(unsafeWindow.__data)
  else
    inspect_scripts()
}

init()

// -----------------------------------------------------------------------------
