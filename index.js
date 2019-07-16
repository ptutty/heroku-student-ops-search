const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const searchApp = require('./searchapp/searchapp');

async function getResults(res) {
  await searchApp.prepare();
  const urlArray = searchApp.makeUrlArray();
  searchApp.fetchUrlArray(urlArray)
    .then(results => {
      searchApp.writeFile(results);
      res.send("<p>You can find the <a href='data/docs_to_index.json'>newly generated search index here.</a> Save it and upload it to Sitebuilder.</p>");
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
