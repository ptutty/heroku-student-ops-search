const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 5000;
const searchApp = require('./searchapp/searchapp');


express()
  .use(bodyParser.json())
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/download', (req, res) => res.download("public/data/docs_to_index.json"))
  .get('/downloadcustom', (req, res) => res.download("public/data/custom.json"))
  .get('/downloadteams', (req, res) => res.download("public/data/teams.json"))
  .get('/editor/:id', (req, res) => res.render('pages/editor', {
    slug: req.params.id}))
  // endpoint to kick start API crawl and writing of json
  .use('/create', (req, res) => searchApp.apiCtrl(req, res, "create") )
  // endpoint for saving edits to the json file using jsoneditor
  .post('/update', (req, res) => searchApp.apiCtrl(req, res, "update") )

  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
