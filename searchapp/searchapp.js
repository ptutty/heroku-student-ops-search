const _ = require('lodash');
const fs = require("fs-extra");
const del = require('del');
const fetch = require("node-fetch");
const {
    RateLimit
} = require('async-sema'); // for throttling API calls
const searchConfig = require('./config/searchconfig'); // config for saving files /urls etc..

const searchApp = {
    searchInit: async function (res) {
        await this.deleteFile(searchConfig.fileName); // delete old file
        const urlArray = await this.makeUrlArray();

        this.fetchUrlArray(urlArray)
            .then(async results => {
                //do we need to customise results?
                if (searchConfig.overRide) {
                    results = this.customResults(results);
                }
                let message;
                if (await this.writeFile(results, searchConfig.fileName)) {
                    message = "Index successfully written";
                } else {
                    message = "There was a problem with writing file";
                }
                res.send(message);

            })
            .catch(err => function () {
                console.log("search-init error log", err);
                res.send(err);
            });
    },

    /* creates an array of api endpoints based on data from /data/teams.json */
    makeUrlArray: async function () {            
        const teams = await this.readJsonFile('teams.json');

        let a = [];
        teams.forEach(function (team) {
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

    readJsonFile: async function (filename) {
        let fullPath = __dirname + "/../" + searchConfig.writePath + filename;
        try {
            const teams = await fs.readJson(fullPath);
            return teams;
        } catch (err) {
            console.error(err)
        }
    },


    /* writes search results to disk as json file */
    writeFile: async function (results, filename) {
        let fullPath = __dirname + "/../" + searchConfig.writePath + filename;
        console.log(fullPath);
        try {
            await fs.writeJson(fullPath, results);
            console.log('success!')
            return true;
        } catch (err) {
            console.error(err)
            return false;
        }
    },

    // delete json file before writing new one
    deleteFile: async function (filename) {
        if (filename) {
            let fullpath = __dirname + "/../" + searchConfig.writePath + filename;
            await del([fullpath], {
                force: true
            });
        }
    },
    // updates teams.json
    updateSeeds: async function (req, res) {
        let filename = "teams.json";
        await this.deleteFile(filename); // delete old file;
        await this.writeFile(JSON.parse(req.body.data), filename); // write newfile
    }
}

module.exports = searchApp;