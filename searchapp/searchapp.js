const _ = require('lodash');
const fs = require("fs-extra");
const del = require('del');
const fetch = require("node-fetch");
const {
    RateLimit
} = require('async-sema'); // for throttling API calls
const searchConfig = require('./config/searchconfig'); // config for saving files /urls etc..

const searchApp = {

     /**
      * @param res Response object from express
      */
    searchInit: async function (res) {
        const urlArray = await this.makeUrlArray();
        const results = await this.fetchUrlArray(urlArray);
        const customResults = await this.customResults(results);
        const status = await this.writeFile(customResults, searchConfig.indexFilename);
        this.userMessage(status, res);
    },

    /* creates an array of api endpoints based on data from /data/teams.json */
    makeUrlArray: async function () {            
        const teams = await this.readJsonFile(searchConfig.teamsFilename);
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
        console.log("crawling search API using url prefixes and keywords");
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
    customResults: async function (results) {
        const customResults = await this.readJsonFile(searchConfig.customFilename);
        results.forEach(function (origItem) {
            customResults.forEach(function (customItem) {
                let customKeyword = customItem['keyword'].toLowerCase();
                let origKeyword = origItem['keyword'].toLowerCase();
                if (customKeyword === origKeyword) {
                    if (customItem['link']) {
                        origItem['link'] = customItem['link'];
                    }
                    origItem['title'] = customItem['title'];
                }
            })
        });
        console.log('customise results success!')
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
        await this.deleteFile(filename);
        let fullPath = __dirname + "/../" + searchConfig.writePath + filename;
        try {
            await fs.writeJson(fullPath, results);
            console.log(fullPath + ' write file success!')
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
    // updates teams.json and customsearch.json and creates new index
    updateFile: async function (req, res) {
        let filename = req.body.filename;
        await this.deleteFile(filename); // delete old file;
        await this.writeFile(JSON.parse(req.body.data), filename); // write newfile 

        if (req.body.crawl) { // do fresh crawl
            this.searchInit(res); 
        } else { // no crawl just update current index
            const results = await this.readJsonFile(searchConfig.indexFilename);
            const customResults = await this.customResults(results);
            const status = await this.writeFile(customResults, searchConfig.indexFilename);
            this.userMessage(status, res);
        }
    },

    userMessage: function (status, res) { // expand message types with switch, pass in message type.
        let message;
        if (status) {
            message = "Index successfully written";
        } else {
            message = "There was a problem with writing file";
        }
        res.send(message);
    }
}

module.exports = searchApp;