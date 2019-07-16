const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const searchApp = require('./searchapp/searchapp');


express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/results', (req, res) => searchApp.searchInit(res))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
