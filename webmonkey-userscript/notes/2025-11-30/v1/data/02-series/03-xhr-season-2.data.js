const fs = require('fs')

eval('global.data = ' + fs.readFileSync(__filename.replace(/\.js$/, '.json'), {encoding: 'utf8'}))

const series = {
  title:   data.title,
  seasons: []
}

for (let season of data.children) {
  const episodes = []

  series.seasons.push({
    title: season.title,
    episodes
  })

  for (let episode of season.children) {
    episodes.push({
      title:       episode.title,
      description: episode.description,
      video:       episode.url,
      subtitles:   episode.has_subtitle ? episode.subtitles[0].url : null      
    })
  }
}

console.log(JSON.stringify({series}, null, 2))
