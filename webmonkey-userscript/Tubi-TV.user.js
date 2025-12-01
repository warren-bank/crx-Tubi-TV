// ==UserScript==
// @name         Tubi TV
// @description  Watch videos in external player.
// @version      3.0.0
// @match        *://*.tubitv.com/*
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
  "common": {
    "disable_modal_age_dialog":      true,
    "convert_carousel_to_grid":      true,
    "rewrite_page_dom":              true
  },
  "webmonkey": {
    "post_intent_redirect_to_url":  "about:blank"
  },
  "greasemonkey": {
    "redirect_to_webcast_reloaded": true,
    "force_http":                   true,
    "force_https":                  false
  }
}

var strings = {
  "button_start_video":            "Start Video",
  "episode_labels": {
    "title":                       "title:",
    "summary":                     "summary:",
    "time_duration":               "duration:",
    "drm":                         "drm:"
  },
  "episode_units": {
    "duration_hour":               "hour",
    "duration_hours":              "hours",
    "duration_minutes":            "minutes"
  }
}

var constants = {
  "captions_preferred_language":   "english",
  "dom_classes": {
    "div_webcast_icons":           "icons-container",
    "anchor_episode_in_series":    "episode-in-series"
  },
  "img_urls": {
    "base_webcast_reloaded_icons": "https://github.com/warren-bank/crx-webcast-reloaded/raw/gh-pages/chrome_extension/2-release/popup/img/"
  }
}

// ----------------------------------------------------------------------------- helpers

var make_element = function(elementName, html) {
  var el = unsafeWindow.document.createElement(elementName)

  if (html)
    el.innerHTML = html

  return el
}

var add_style_element = function(css) {
  if (!css) return

  var head = unsafeWindow.document.getElementsByTagName('head')[0]
  if (!head) return

  if ('function' === (typeof css))
    css = css()
  if (Array.isArray(css))
    css = css.join("\n")

  head.appendChild(
    make_element('style', css)
  )
}

var cancel_event = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=false;
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, drm_scheme, drm_server, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.greasemonkey.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.greasemonkey.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, encoded_drm_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : unsafeWindow.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))
  encoded_drm_url       = (drm_scheme && drm_server) ? encodeURIComponent(encodeURIComponent(btoa(drm_scheme + '|' + drm_server))) : null

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

  webcast_reloaded_url  = webcast_reloaded_base    + '#/watch/'    + encoded_video_url
                            + (encoded_vtt_url     ? ('/subtitle/' + encoded_vtt_url) : '')
                            + (encoded_referer_url ? ('/referer/'  + encoded_referer_url) : '')
                            + (encoded_drm_url     ? ('/drm/'      + encoded_drm_url) : '')

  return webcast_reloaded_url
}

var get_webcast_reloaded_url_chromecast_sender = function(video_url, vtt_url, referer_url, drm_scheme, drm_server) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, drm_scheme, drm_server, /* force_http= */ null, /* force_https= */ null).replace('/index.html', '/chromecast_sender.html')
}

var get_webcast_reloaded_url_airplay_sender = function(video_url, vtt_url, referer_url, drm_scheme, drm_server) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, drm_scheme, drm_server, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/airplay_sender.es5.html')
}

var get_webcast_reloaded_url_proxy = function(hls_url, vtt_url, referer_url, drm_scheme, drm_server) {
  return get_webcast_reloaded_url(hls_url, vtt_url, referer_url, drm_scheme, drm_server, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/proxy.html')
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if (typeof GM_resolveUrl === 'function')
      url = GM_resolveUrl(url, unsafeWindow.location.href) || url

    GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_webmonkey_post_intent_redirect_to_url = function() {
  var url = null

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'string')
    url = user_options.webmonkey.post_intent_redirect_to_url

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'function')
    url = user_options.webmonkey.post_intent_redirect_to_url()

  if (typeof url === 'string')
    redirect_to_url(url)
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server) {
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
    if (drm_scheme && drm_server) {
      args.push('drmScheme')
      args.push(drm_scheme)

      args.push('drmUrl')
      args.push(drm_server)
    }

    GM_startIntent.apply(this, args)
    process_webmonkey_post_intent_redirect_to_url()
    return true
  }
  else if (user_options.greasemonkey.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url, drm_scheme, drm_server))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url, drm_scheme, drm_server) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url, drm_scheme, drm_server)
}

var process_dash_url = function(dash_url, vtt_url, referer_url, drm_scheme, drm_server) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url, drm_scheme, drm_server)
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - URL links to tools on Webcast Reloaded website

var make_webcast_reloaded_div = function(video_url, vtt_url, referer_url, drm_scheme, drm_server) {
  var webcast_reloaded_urls = {
//  "index":             get_webcast_reloaded_url(                  video_url, vtt_url, referer_url, drm_scheme, drm_server),
    "chromecast_sender": get_webcast_reloaded_url_chromecast_sender(video_url, vtt_url, referer_url, drm_scheme, drm_server),
    "airplay_sender":    get_webcast_reloaded_url_airplay_sender(   video_url, vtt_url, referer_url, drm_scheme, drm_server),
    "proxy":             get_webcast_reloaded_url_proxy(            video_url, vtt_url, referer_url, drm_scheme, drm_server)
  }

  var div = make_element('div')

  var html = [
    '<a target="_blank" class="chromecast" href="' + webcast_reloaded_urls.chromecast_sender   + '" title="Chromecast Sender"><img src="'       + constants.img_urls.base_webcast_reloaded_icons + 'chromecast.png"></a>',
    '<a target="_blank" class="airplay" href="'    + webcast_reloaded_urls.airplay_sender      + '" title="ExoAirPlayer Sender"><img src="'     + constants.img_urls.base_webcast_reloaded_icons + 'airplay.png"></a>',
    '<a target="_blank" class="proxy" href="'      + webcast_reloaded_urls.proxy               + '" title="HLS-Proxy Configuration"><img src="' + constants.img_urls.base_webcast_reloaded_icons + 'proxy.png"></a>',
    '<a target="_blank" class="video-link" href="' + video_url                                 + '" title="direct link to video"><img src="'    + constants.img_urls.base_webcast_reloaded_icons + 'video_link.png"></a>'
  ]

  div.setAttribute('class', constants.dom_classes.div_webcast_icons)
  div.innerHTML = html.join("\n")

  return div
}

var insert_webcast_reloaded_div = function(block_element, video_url, vtt_url, referer_url, drm_scheme, drm_server) {
  var webcast_reloaded_div = make_webcast_reloaded_div(video_url, vtt_url, referer_url, drm_scheme, drm_server)

  if (block_element.childNodes.length)
    block_element.insertBefore(webcast_reloaded_div, block_element.childNodes[0])
  else
    block_element.appendChild(webcast_reloaded_div)
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - play video button

var onclick_start_video_button = function(event) {
  cancel_event(event)

  var button      = event.target
  var video_url   = button.getAttribute('x-video-url')
  var video_type  = button.getAttribute('x-video-type')
  var vtt_url     = button.getAttribute('x-vtt-url')
  var referer_url = button.getAttribute('x-referer-url')
  var drm_scheme  = button.getAttribute('x-drm-scheme')
  var drm_server  = button.getAttribute('x-drm-server')

  if (video_url)
    process_video_url(video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server)
}

var make_start_video_button = function(video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server) {
  var button = make_element('button')

  button.setAttribute('x-video-url',   video_url   || '')
  button.setAttribute('x-video-type',  video_type  || '')
  button.setAttribute('x-vtt-url',     vtt_url     || '')
  button.setAttribute('x-referer-url', referer_url || '')
  button.setAttribute('x-drm-scheme',  drm_scheme  || '')
  button.setAttribute('x-drm-server',  drm_server  || '')

  button.innerHTML = strings.button_start_video
  button.addEventListener("click", onclick_start_video_button)

  return button
}

var add_start_video_button = function(block_element, old_button, video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server) {
  var new_button = make_start_video_button(video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server)

  if (old_button)
    old_button.parentNode.replaceChild(new_button, old_button)
  else
    block_element.appendChild(new_button)
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - single video list item

var convert_ms_to_mins = function(X) {
  // (X ms)(1 sec / 1000 ms)(1 min / 60 sec)
  return Math.ceil(X / 60000)
}

var get_ms_duration_time_string = function(ms) {
  var time_string = ''
  var mins = convert_ms_to_mins(ms)
  var hours

  if (mins >= 60) {
    hours       = Math.floor(mins / 60)
    time_string = hours + ' ' + ((hours < 2) ? strings.episode_units.duration_hour : strings.episode_units.duration_hours) + ', '
    mins        = mins % 60
  }

  return time_string + mins + ' ' + strings.episode_units.duration_minutes
}

var make_video_listitem_element = function(video) {
  var li, tr, html
  var drm_item, drm_info, td_button, td_icons, div_icons, a_icons, a_icon
  var video_data = extract_video_data(video, /* add_drm_data= */ true)

  if (!video_data.video_url && !video_data.drm_data.length) return li

  var append_tr = function(td, colspan) {
    if (Array.isArray(td))
      tr.push('<tr><td>' + td.join('</td><td>') + '</td></tr>')
    else if ((typeof colspan === 'number') && (colspan > 1))
      tr.push('<tr><td colspan="' + colspan + '">' + td + '</td></tr>')
    else
      tr.push('<tr><td>' + td + '</td></tr>')
  }

  tr = []
  if (video.title)
    append_tr([strings.episode_labels.title, video.title])
  if (video.duration)
    append_tr([strings.episode_labels.time_duration, get_ms_duration_time_string(video.duration * 1000)])
  if (video.description)
    append_tr(strings.episode_labels.summary, 2)

  html = [
    '<table>' + tr.join("\n") + '</table>',
    '<blockquote>' + video.description + '</blockquote>'
  ]

  if (!video_data.video_url && video_data.drm_data.length) {
    tr = []
    append_tr([strings.episode_labels.drm, '<!-- drm_scheme (raw_type, drm_dhcp) -->', '<!-- button -->', '<!-- icons -->'])

    for (var i=0; i < video_data.drm_data.length; i++) {
      drm_item = video_data.drm_data[i]

      drm_info  = drm_item.drm_scheme
      drm_info += '<div><ul>'
      drm_info += '  <li>' + drm_item.raw_type + '</li>'
      drm_info += '  <li>' + drm_item.drm_dhcp + '</li>'
      drm_info += '</ul></div>'

      append_tr(['', drm_info, '', ''])
    }

    html.push(
      '<table>' + tr.join("\n") + '</table>'
    )

    li = make_element('li', html.join("\n"))
    tr = li.querySelectorAll(':scope > table:last-child tr')

    for (var i=1; i < tr.length; i++) {
      td_icons  = tr[i].querySelector(':scope > td:last-child')
      td_button = td_icons.previousElementSibling

      drm_item  = video_data.drm_data[i-1]
      div_icons = make_webcast_reloaded_div(drm_item.video_url, video_data.vtt_url, /* referer_url= */ null, drm_item.drm_scheme, drm_item.drm_server)

      a_icons = {
        real:    {},  // order: chromecast, airplay, [proxy], video-link
        ordered: []
      }

      a_icons.real.airplay    = div_icons.querySelector('a.airplay')
      a_icons.real.direct_hls = div_icons.querySelector('a.video-link')

      a_icon = a_icons.real.direct_hls.cloneNode(/* deep= */ true)
      a_icon.className = 'chromecast'
      a_icons.ordered.push(a_icon)

      a_icon = a_icons.real.direct_hls.cloneNode(/* deep= */ true)
      a_icon.className = 'airplay'
      a_icon.setAttribute('href',  drm_item.drm_server)
      a_icon.setAttribute('title', 'direct link to ' + drm_item.drm_scheme + ' drm server')
      a_icons.ordered.push(a_icon)

      a_icon = a_icons.real.airplay.cloneNode(/* deep= */ true)
      a_icon.className = 'video-link'
      a_icons.ordered.push(a_icon)

      while (div_icons.childNodes.length)
        div_icons.removeChild(div_icons.childNodes[0])

      for (var j=0; j < a_icons.ordered.length; j++) {
        a_icon = a_icons.ordered[j]

        div_icons.appendChild(a_icon)
      }
      a_icons = null

      td_icons.appendChild(div_icons)
      add_start_video_button(/* block_element= */ td_button, /* old_button= */ null, drm_item.video_url, drm_item.video_type, video_data.vtt_url, /* referer_url= */ null, drm_item.drm_scheme, drm_item.drm_server)
    }
  }
  else {
    li = make_element('li', html.join("\n"))
    insert_webcast_reloaded_div(/* block_element= */ li, video_data.video_url, video_data.vtt_url)
    add_start_video_button(     /* block_element= */ li, /* old_button= */ null, video_data.video_url, video_data.video_type, video_data.vtt_url)
  }

  return li
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - single episode in series without available video data

var pad = function(num, min_length, pad_char, pad_right) {
  num        = String(num)
  min_length = min_length || 0
  pad_char   = pad_char || '0'
  pad_right  = !!pad_right
  var count, padding

  count = min_length - num.length
  if (count > 0) {
    padding = pad_char.repeat(count)

    if (pad_right)
      num += padding
    else
      num = padding + num
  }
  return num
}

var make_episode_link_listitem_element = function(episode_key, season_number, episode_number) {
  var episode_url   = 'https://tubitv.com/tv-shows/' + episode_key
  var episode_title = 'S' + pad(season_number, 2) + ':E' + pad(episode_number, 2)

  var html = [
    '<table>',
      '<tr>',
        '<td>',
          strings.episode_labels.title,
        '</td>',
        '<td>',
          '<a class="' + constants.dom_classes.anchor_episode_in_series + '" target="_blank" href="' + episode_url + '">' + episode_title + '</a>',
        '</td>',
      '</tr>',
    '</table>'
  ]

  var li = make_element('li', html.join("\n"))
  return li
}

// ----------------------------------------------------------------------------- DOM: static skeleton

var reinitialize_dom_with_episodes_in_series = function(episodes, series) {
  var div, ul, li, a
  try {
    if (!Array.isArray(episodes) || !episodes.length) return

    div = make_element('div')
    ul  = make_element('ul')
    div.appendChild(ul)

    if (series && (series instanceof Object)) {
      if (series.title) {
        div.insertBefore(
          make_element('h2', series.title),
          ul
        )
      }

      if (series.description) {
        div.insertBefore(
          make_element('div', series.description),
          ul
        )
      }
    }

    for (var i=0; i < episodes.length; i++) {
      li = make_element('li')
      a  = make_element('a')
      li.appendChild(a)
      ul.appendChild(li)

      a.setAttribute('href', 'https://tubitv.com/tv-shows/' + episodes[i].video_id)
      a.textContent = episodes[i].name
    }

    unsafeWindow.document.body.innerHTML = ''
    unsafeWindow.document.body.appendChild(div)

    add_style_element(function(){
      return [
        // --------------------------------------------------- reset

        'body {',
        '  margin: 0;',
        '  padding: 0;',
        '  font-family: serif;',
        '  font-size: 16px;',
        '  background-color: #fff !important;',
        '  overflow: auto !important;',
        '}',

        // --------------------------------------------------- series title

        'body > div > h2 {',
        '  display: block;',
        '  margin: 0;',
        '  padding: 0.5em;',
        '  font-size: 22px;',
        '  text-align: center;',
        '  background-color: #ccc;',
        '}',

        // --------------------------------------------------- series description

        'body > div > div {',
        '  padding: 0.5em;',
        '  font-size: 18px;',
        '}',

        // --------------------------------------------------- list of episodes

        'body > div > ul > li {',
        '  padding-left: 1em;',
        '  line-height: 1.5em;',
        '}'
      ]
    })
  }
  catch(e) {}
}

// -----------------------------------------------------------------------------

var reinitialize_dom_with_video = function(video, series) {
  var div, ul, li
  try {
    if (!video || ('object' !== (typeof video))) return

    div = make_element('div')
    ul  = make_element('ul')
    div.appendChild(ul)

    if (series && (series instanceof Object)) {
      if (series.title) {
        div.insertBefore(
          make_element('h2', series.title),
          ul
        )
      }

      if (series.description) {
        div.insertBefore(
          make_element('div', series.description),
          ul
        )
      }
    }

    if (video.url || (Array.isArray(video.video_resources) && video.video_resources.length)) {
      li = make_video_listitem_element(video)
      if (li)
        ul.appendChild(li)
    }

    if (!ul.childNodes.length) return

    unsafeWindow.document.body.innerHTML = ''
    unsafeWindow.document.body.appendChild(div)

    add_style_element(function(){
      return [
        // --------------------------------------------------- reset

        'body {',
        '  margin: 0;',
        '  padding: 0;',
        '  font-family: serif;',
        '  font-size: 16px;',
        '  background-color: #fff !important;',
        '  overflow: auto !important;',
        '}',

        // --------------------------------------------------- series title

        'body > div > h2 {',
        '  display: block;',
        '  margin: 0;',
        '  padding: 0.5em;',
        '  font-size: 22px;',
        '  text-align: center;',
        '  background-color: #ccc;',
        '}',

        // --------------------------------------------------- series description

        'body > div > div {',
        '  padding: 0.5em;',
        '  font-size: 18px;',
        '}',

        // --------------------------------------------------- list of videos: episodes in series, or individual movie or episode

        'body > div > ul {',
        '  list-style: none;',
        '  margin: 0;',
        '  padding: 0;',
        '  padding-left: 1em;',
        '  padding-bottom: 1em;',
        '}',

        'body > div > ul > li {',
        '  list-style: none;',
        '  margin-top: 0.5em;',
        '  border-top: 1px solid #999;',
        '  padding-top: 0.5em;',
        '}',

        'body > div > ul > li > table td:first-child {',
        '  font-style: italic;',
        '  padding-right: 1em;',
        '}',

        'body > div > ul > li > blockquote {',
        '  display: block;',
        '  background-color: #eee;',
        '  padding: 0.5em 1em;',
        '  margin: 0;',
        '}',

        'body > div > ul > li > button {',
        '  margin: 0.75em 0;',
        '}',

        // --------------------------------------------------- drm

        'body > div > ul > li > blockquote + table {',
        '  width: 100%;',
        '  border-collapse: collapse;',
        '}',

        'body > div > ul > li > blockquote + table tr > td:first-child + td {',
        '  width: 100%;',
        '}',

        'body > div > ul > li > blockquote + table tr > td {',
        '  border-top: 1px solid #999;',
        '  padding: 0.5em 0;',
        '}',

        'body > div > ul > li > blockquote + table tr:first-child > td {',
        '  border-top-style: none;',
        '}',

        'body > div > ul > li > blockquote + table tr > td:first-child {',
        '  border-top-style: none;',
        '}',

        'body > div > ul > li > blockquote + table tr > td > div > ul {',
        '  padding-left: 2em;',
        '  padding-top: 0.5em;',
        '}',

        'body > div > ul > li > blockquote + table tr > td > div > ul > li {',
        '  font-size: 0.85em;',
        '}',

        'body > div > ul > li > blockquote + table button {',
        '  white-space: nowrap;',
        '}',

        'body > div > ul > li > blockquote + table tr > td:last-child > div.icons-container {',
        '}',

        // --------------------------------------------------- links to tools on Webcast Reloaded website

        'body > div > ul > li div.icons-container {',
        '  display: block;',
        '  position: relative;',
        '  z-index: 1;',
        '  float: right;',
        '  margin: 0.5em;',
        '  width: 60px;',
        '  height: 60px;',
        '  max-height: 60px;',
        '  vertical-align: top;',
        '  background-color: #d7ecf5;',
        '  border: 1px solid #000;',
        '  border-radius: 14px;',
        '}',

        'body > div > ul > li div.icons-container > a.chromecast,',
        'body > div > ul > li div.icons-container > a.chromecast > img,',
        'body > div > ul > li div.icons-container > a.airplay,',
        'body > div > ul > li div.icons-container > a.airplay > img,',
        'body > div > ul > li div.icons-container > a.proxy,',
        'body > div > ul > li div.icons-container > a.proxy > img,',
        'body > div > ul > li div.icons-container > a.video-link,',
        'body > div > ul > li div.icons-container > a.video-link > img {',
        '  display: block;',
        '  width: 25px;',
        '  height: 25px;',
        '}',

        'body > div > ul > li div.icons-container > a.chromecast,',
        'body > div > ul > li div.icons-container > a.airplay,',
        'body > div > ul > li div.icons-container > a.proxy,',
        'body > div > ul > li div.icons-container > a.video-link {',
        '  position: absolute;',
        '  z-index: 1;',
        '  text-decoration: none;',
        '}',

        'body > div > ul > li div.icons-container > a.chromecast,',
        'body > div > ul > li div.icons-container > a.airplay {',
        '  top: 0;',
        '}',
        'body > div > ul > li div.icons-container > a.proxy,',
        'body > div > ul > li div.icons-container > a.video-link {',
        '  bottom: 0;',
        '}',

        'body > div > ul > li div.icons-container > a.chromecast,',
        'body > div > ul > li div.icons-container > a.proxy {',
        '  left: 0;',
        '}',
        'body > div > ul > li div.icons-container > a.airplay,',
        'body > div > ul > li div.icons-container > a.video-link {',
        '  right: 0;',
        '}',
        'body > div > ul > li div.icons-container > a.airplay + a.video-link {',
        '  right: 17px; /* (60 - 25)/2 to center when there is no proxy icon */',
        '}'
      ]
    })
  }
  catch(e) {}
}

// ----------------------------------------------------------------------------- normalize video data

var extract_video_data = function(video, add_drm_data) {
  var video_url, video_type, vtt_url
  var drm_data = []

  if (video && ('object' === (typeof video))) {
    vtt_url   = (video.subtitles && Array.isArray(video.subtitles) && video.subtitles.length)
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

    if (video.url) {
      video_url  = video.url
      video_type = 'application/x-mpegurl'
    }
    else if (add_drm_data && Array.isArray(video.video_resources) && video.video_resources.length) {
      drm_data = video.video_resources.map(function(video_resource){
        var drm_item = {
          video_url:  null,
          video_type: null,
          raw_type:   null,
          drm_scheme: null,
          drm_server: null,
          drm_dhcp:   null
        }

        var schemes = ['widevine', 'clearkey', 'playready', 'fairplay']
        var scheme

        try {
          drm_item.video_url  = video_resource.manifest.url
          drm_item.video_type = 'application/x-mpegurl'
          drm_item.raw_type   = video_resource.type

          if (video_resource.type.indexOf('dash') >= 0)
            drm_item.video_type = 'application/dash+xml'

          for (var i=0; i < schemes.length; i++) {
            scheme = schemes[i]

            if (video_resource.type.indexOf(scheme) >= 0) {
              drm_item.drm_scheme = scheme
              break
            }
          }

          drm_item.drm_server = video_resource.license_server.url
          drm_item.drm_dhcp   = video_resource.license_server.hdcp_version
        }
        catch(e){}

        return drm_item
      })

      drm_data = drm_data.filter(function(drm_item){
        return (drm_item.video_url && drm_item.drm_scheme && drm_item.drm_server)
      })
    }
  }

  return {video_url: video_url, video_type: video_type, vtt_url: vtt_url, drm_data: drm_data}
}

// ----------------------------------------------------------------------------- extract page data

var extract_episodes_in_series_from_page_data = function(page_data) {
  var episodes = []
  var query, season, episode

  if (page_data && (page_data instanceof Object) && Array.isArray(page_data.queries)) {
    for (var i=0; i < page_data.queries.length; i++) {
      query = page_data.queries[i]

      try {
        if (Array.isArray(query.state.data.seasons)) {
          for (var j=0; j < query.state.data.seasons.length; j++) {
            season = query.state.data.seasons[j]

            if (season && (season instanceof Object) && season.number && Array.isArray(season.episodes)) {
              for (var k=0; k < season.episodes.length; k++) {
                episode = season.episodes[k]

                if (episode && (episode instanceof Object) && episode.id && episode.num) {
                  episodes.push({
                    name: ('S' + pad(season.number, 2) + 'E' + pad(episode.num, 2)),
                    video_id: episode.id
                  })
                }
              }
            }
          }
        }
      }
      catch(e) {}
    }
  }

  return episodes.length
    ? episodes
    : null
}

var extract_series_from_page_data = function(page_data) {
  var query, page

  if (page_data && (page_data instanceof Object) && Array.isArray(page_data.queries)) {
    for (var i=0; i < page_data.queries.length; i++) {
      query = page_data.queries[i]

      try {
        if (Array.isArray(query.state.data.pages)) {
          for (var j=0; j < query.state.data.pages.length; j++) {
            page = query.state.data.pages[j]

            if (page && (page instanceof Object) && (page.type === 's') && page.title) {
              return {
                title:       page.title,
                description: page.description
              }
            }
          }
        }
      }
      catch(e) {}
    }
  }

  return null
}

var extract_video_from_page_data = function(video_id, page_data) {
  var query, page

  if (video_id && page_data && (page_data instanceof Object) && Array.isArray(page_data.queries)) {
    for (var i=0; i < page_data.queries.length; i++) {
      query = page_data.queries[i]

      try {
        if (Array.isArray(query.state.data.pages)) {
          for (var j=0; j < query.state.data.pages.length; j++) {
            page = query.state.data.pages[j]

            if (page && (page instanceof Object) && (page.type === 'v') && (page.id === video_id)) {
              return page
            }
          }
        }
      }
      catch(e) {}
    }
  }

  return null
}

// ----------------------------------------------------------------------------- process page data

var process_series = function(page_data) {
  var episodes = extract_episodes_in_series_from_page_data(page_data)
  var series   = extract_series_from_page_data(page_data)

  if (episodes && user_options.common.rewrite_page_dom)
    reinitialize_dom_with_episodes_in_series(episodes, series)
}

var process_episode = function(video_id, page_data) {
  var video = extract_video_from_page_data(video_id, page_data)
  var video_data, found_video_url, series

  if (video) {
    video_data = extract_video_data(video)

    if (video_data.video_url) {
      found_video_url = true
      process_video_url(video_data.video_url, video_data.video_type, video_data.vtt_url)
    }

    // prevent WebMonkey redirect when video is started from reinitialized DOM
    if (!found_video_url)
      user_options.webmonkey.post_intent_redirect_to_url = null

    if (user_options.common.rewrite_page_dom) {
      series = extract_series_from_page_data(page_data)

      reinitialize_dom_with_video(video, series)
    }
  }
}

var process_movie = process_episode

// ----------------------------------------------------------------------------- change CSS for modal dialog that requires entering DOB

var disable_modal_age_dialog = function() {
  var modal_divs = unsafeWindow.document.querySelectorAll('[data-nosnippet="true"]')
  for (var i=0; i < modal_divs.length; i++) {
    modal_divs[i].style.display = 'none'
  }
  if (modal_divs.length) {
    unsafeWindow.setTimeout(
      function() {
        unsafeWindow.document.body.style.overflow = 'auto'
      },
      1000
    )
  }
}

// ----------------------------------------------------------------------------- change CSS for carousel containing all episodes in a season for a series, which doesn't work in older browsers

var convert_carousel_to_grid = function() {
  add_style_element(function(){
    return [
      '.web-carousel__container,',
      '.web-carousel__container > .web-grid-container {',
      '  display: block !important;',
      '  height: auto !important;',
      '  white-space: normal !important;',
      '}',

      '.web-carousel__container > .web-grid-container > .web-col {',
      '  display: inline-block !important;',
      '}'
    ]
  })
}

// ----------------------------------------------------------------------------- redirect page URL when navigation links are followed

var follow_all_links = function() {
  follow_anchor_elements()
  follow_content_tiles()
  intercept_history_state_updates()
}

var follow_anchor_elements = function() {
  unsafeWindow.document.addEventListener('click', function(event){
    var anchor = event.target
    var depth  = 5
    var ignore = false

    while ((!(anchor instanceof HTMLAnchorElement)) && anchor.parentNode && (depth >= 0)) {
      depth--
      anchor = anchor.parentNode
    }

    if (anchor instanceof HTMLAnchorElement) {
      ignore = ignore || (anchor.parentNode && (anchor.parentNode.className === constants.dom_classes.div_webcast_icons))
      ignore = ignore || (anchor.className === constants.dom_classes.anchor_episode_in_series)

      if (!ignore) {
        redirect_to_url(
          anchor.getAttribute('href')
        )
        cancel_event(event)
      }
    }
  })
}

var follow_content_tiles = function() {
  var tiles = unsafeWindow.document.querySelectorAll('div.web-content-tile')

  if (tiles && tiles.length) {
    for (var i=0; i < tiles.length; i++) {
      tiles[i].addEventListener('click', follow_content_tile_onclick)
    }
  }
}

var follow_content_tile_onclick = function(event) {
  var anchor = event.target.querySelector(':scope a.web-content-tile__title[href]')

  if (anchor) {
    redirect_to_url(
      anchor.getAttribute('href')
    )
    cancel_event(event)
  }
}

var intercept_history_state_updates = function() {
  unsafeWindow.history.pushState    = history_state_onupdate
  unsafeWindow.history.replaceState = history_state_onupdate
}

var history_state_onupdate = function(stateObj, unused, url) {
  if (url) {
    redirect_to_url(url)
  }
}

// ----------------------------------------------------------------------------- bootstrap

var inspect_scripts = function(callback) {
  var tags    = unsafeWindow.document.querySelectorAll('script:not([src])')
  var prefix  = 'window.__REACT_QUERY_STATE__='
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
          text = text.replace(/undefined/g, 'null')
          text = text.replace(/new Date\([^\)]*\)/g, 'null')

          data = JSON.parse(text)
          callback(data)
        }
        catch(e2) {
          //console.log('JSON Parser Error:', e2.message, e2)
          //console.log(text)
        }
        break
      }
    }
    catch(e1) {}
  }
}

var init = function() {
  var gmUrl
  if ('function' === (typeof GM_getUrl)) {
    gmUrl = GM_getUrl()
    if (gmUrl && (gmUrl !== unsafeWindow.location.href)) {
      redirect_to_url(unsafeWindow.location.href)
      return
    }
  }

  follow_all_links()

  if (user_options.common.disable_modal_age_dialog) {
    disable_modal_age_dialog()
    unsafeWindow.setTimeout(disable_modal_age_dialog, 1000)
  }

  if (user_options.common.convert_carousel_to_grid)
    convert_carousel_to_grid()

  var path_name  = unsafeWindow.location.pathname
  var path_regex = /^\/(series|tv-shows|movies)(?:\/([^\/]+))?.*$/
  var path_match = path_regex.exec(path_name)
  var callback, video_id

  if (path_match) {
    switch(path_match[1]) {
      case 'series':
        callback = process_series
        break
      case 'tv-shows':
        video_id = path_match[2]
        if (video_id)
          callback = process_episode.bind(null, video_id)
        break
      case 'movies':
        video_id = path_match[2]
        if (video_id)
          callback = process_movie.bind(null, video_id)
        break
    }

    if (callback) {
      if (unsafeWindow.__REACT_QUERY_STATE__)
        callback(unsafeWindow.__REACT_QUERY_STATE__)
      else
        inspect_scripts(callback)
    }
  }
}

init()

// -----------------------------------------------------------------------------
