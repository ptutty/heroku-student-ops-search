const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const searchApp = require('./searchapp/searchapp');

function getResults(res) {
  const urlArray = searchApp.makeUrlArray();
  searchApp.fetchUrlArray(urlArray)
    .then(results => {
      res.send(results);
      console.log("results fetch successful");
    })
    .catch(err => console.log("An error occurred", err));
}


express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/results', (req, res) => getResults(res) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
