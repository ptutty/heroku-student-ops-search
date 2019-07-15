const express = require('express')
const path = require('path')
const stringify = require('json-stringify-safe');
const fetch = require("node-fetch");
const fs = require('fs');
const del = require('del');
const searchConfig = require('./config/searchConfig');
const searchApp = require('./app/searchApp');
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/create', (req, res) => {
    let cleanDir = searchApp.cleanDir();
    console.log(cleanDir);
    res.send();
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
