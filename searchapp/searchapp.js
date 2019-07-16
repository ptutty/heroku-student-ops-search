const _ = require('lodash');
const fs = require("fs-extra");
const del = require('del');
const fetch = require("node-fetch");
const {
    RateLimit
} = require('async-sema'); // for throttling API calls
const searchItems = require('./seeds/keywords'); // warwick domains and keywords to search
const searchConfig = require('./config/searchconfig'); // config for saving files /urls etc..

const searchApp = {

    searchInit: async function (res) {
        await this.prepare(); // delete old file
        this.fetchUrlArray()
            .then(async results => {
                //do we need to customise results?
                if (searchConfig.override){
                    results = this.customResults(results);
                }
                res.send(await this.writeFile(results));
                
            })
            .catch(err => console.log("An error occurred", err));
    },

    /* creates an array of api endpoints based on data from /seed-data/searchseed.js */
    makeUrlArray: function () {
        let a = [];
        searchItems.forEach(function (team) {
            var apiUrl = searchConfig.apiBase + "urlPrefix=" + team.url + "&resultsPerPage=" + searchConfig.resultsNum;
            // remove any possible duplicate keywords
            let keywords = _.uniq(team.keywords);
            for (i = 0; i < keywords.length; i++) {
                a.push(apiUrl + "&q=" + keywords[i]);
            }
        });
        return a;
    },

    fetchUrlArray: async function (urlArray) {
        const urlArray = this.makeUrlArray();
        const lim = RateLimit(searchConfig.throttle); // throttle api calls   
        const allResults = urlArray.map(async (url, index) => {
            await lim();
            return await fetch(url)
                .then(res => res.json())
                .then(json => {
                    return this.resultTidy(json.results[0], url, index); // return result
                });
        });

        return await Promise.all(allResults); // when all promises are processed return all results as array
    },

    /* allow overwriting of generated results using data from searchoverrides.json */
    customResults: function (results) {
        const searchOverRides = require('./config/customsearch.json');
        console.log("adding custom results...");
        results.forEach(function (el, index) {
            searchOverRides.forEach(function (rep_el, index) {
                let keyword_rep = rep_el['keyword'].toLowerCase();
                let keyword_orig = el['keyword'].toLowerCase();
                if (keyword_rep === keyword_orig) {
                    //console.log("replacing " + el['keyword']);
                    if (rep_el['link']) {
                        el['link'] = rep_el['link'];
                    }
                    el['title'] = rep_el['title'];
                }
            })
        });
        return results;
    },

    /* adds and removes fields from search result data */
    resultTidy: function (result, url, index) {
        delete result['score'];
        result['keyword'] = url.split("&q=")[1];
        result['id'] = index + 1;
        delete result['lastModified'];
        delete result['matchText'];
        delete result['siteDescription'];
        return result;
    },

    /* writes search results to disk as json file */
    writeFile: async function (results) {
        const fullPath = __dirname + "/../" + searchConfig.writePath + searchConfig.fileName;
        try {
            await fs.writeJson( fullPath, results );
            let message = `<p>Completed. <a href="/data/${searchConfig.fileName}">JSON search index file created here</a></p>`;
            console.log('success!')
            return message;
        } catch (err) {
            console.error(err)
        }
    },

    // delete current search result file
    prepare: async function () {
        await del([`${searchConfig.fileName}*.json`], {
            force: true
        });
    }
}

module.exports = searchApp;