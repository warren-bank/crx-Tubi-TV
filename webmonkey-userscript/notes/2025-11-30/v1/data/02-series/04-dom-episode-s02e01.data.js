const fs = require('fs')

eval('global.data = ' + fs.readFileSync(__filename.replace(/\.js$/, '.json'), {encoding: 'utf8'}))

const currentVideoKey = Object.keys(data.video.statusById)
console.log(JSON.stringify({currentVideoKey}, null, 2))

const videos = []
for (let videoKey in data.video.fullContentById) {
  if (!data.video.fullContentById[videoKey] || !data.video.byId[videoKey])
    continue

  const videoData = data.video.byId[videoKey]
  videos.push({
    key:         videoKey,
    title:       videoData.title,
    description: videoData.description,
    video:       videoData.url,
    subtitles:   videoData.has_subtitle ? videoData.subtitles[0].url : null
  })
}
console.log(JSON.stringify({videos}, null, 2))
