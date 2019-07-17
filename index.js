const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const PORT = process.env.PORT || 5000
const searchApp = require('./searchapp/searchapp');


express()
  .use(bodyParser.json())
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  // editing seed json file
  .get('/editor', (req, res) => res.render('pages/editor'))
  // endpoint to kick start API crawl and writing of json
  .get('/results', (req, res) => searchApp.searchInit(res)) 
  // endpoint for saving edits to the json file using jsoneditor
  .post('/update', (req, res) => searchApp.updateSeeds(req,res))

  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
