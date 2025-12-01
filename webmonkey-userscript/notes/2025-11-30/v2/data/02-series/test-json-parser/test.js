const fs = require('fs')

const parse_json = (fname) => {
  let text = fs.readFileSync('../' + fname, {encoding: 'utf8'})

  // fix JSON
  text = text.replace(/undefined/g, 'null')
  text = text.replace(/new Date\([^\)]*\)/g, 'null')

  try {
    const data = JSON.parse(text)
    console.log(`[${fname}]`, !!data && (data instanceof Object) && Array.isArray(data.queries))
  }
  catch(e) {
    console.log(`[${fname}]`, e.message)
  }
}

parse_json('01-dom-series.data.json')
parse_json('02-dom-season-2.data.json')
parse_json('03-dom-episode-s02e01.data.json')
