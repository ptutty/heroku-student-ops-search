const _ = require('lodash');
const fs = require("fs-extra");
const del = require('del');
const fetch = require("node-fetch");
const date = require('date-and-time');
const now = new Date();
const {
    RateLimit
} = require('async-sema'); // for throttling API calls
const searchConfig = require('./config/searchconfig'); // config for saving files /urls etc..

const searchApp = {
    /**
     * @param res Response object from express
     */
    searchInit: async function (res) {
        try {
            const urlArray = await this.makeUrlArray();
            const results = await this.fetchUrlArray(urlArray);
            const customResults = await this.customResults(results);
            const resultsWithTimestamp = this.addTimeStamp(customResults);
            const status = await this.writeFile(resultsWithTimestamp, searchConfig.indexFilename);
            this.userMessage(status,res,"Index written");
        } catch (error) {
            this.userMessage(false, res, "error try again", error);
            console.log(error);
        }
    },
    /* creates an array of urls to fetch */
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
    /**
     * @param urlArray array of strings (urls)
     */
    fetchUrlArray: async function (urlArray) {
        console.log("crawling search API using url prefixes and keywords");
        const lim = RateLimit(searchConfig.throttle); // throttle api calls   
        const allResults = urlArray.map(async (url, index) => {
            await lim();
            return await fetch(url)
                .then(res => res.json())
                .then(json => {
                    return this.resultTidy(json.results[0], url, index);
                });
        });

        return await Promise.all(allResults);
    },
    /**
     * @param results array of objects
     */
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
    /**
     * @param customResults array of objects
     */
    addTimeStamp: function (customResults) {
        const resultsWithTS = [];
        const i = {};
        i.created = date.format(now, 'YYYY/MM/DD HH:mm:ss');
        i.searchdoc = customResults;
        resultsWithTS.push(i);
        return resultsWithTS;
    },
    /**
     * @param result object
     * @param url string
     * @param index integer 
     */
    resultTidy: function (result, url, index) {
        delete result['score'];
        result['keyword'] = url.split("&q=")[1];
        result['id'] = index + 1;
        delete result['lastModified'];
        delete result['matchText'];
        delete result['siteDescription'];
        return result;
    },
    /**
     * @param filename string
     */
    readJsonFile: async function (filename) {
        let fullPath = __dirname + "/../" + searchConfig.writePath + filename;
        try {
            const teams = await fs.readJson(fullPath);
            return teams;
        } catch (err) {
            console.error(err)
        }
    },
    /**
     * @param results array of objects
     * @param filename string
     */
    writeFile: async function (results, filename) {
        try {
            await this.deleteFile(filename);
            let fullPath = __dirname + "/../" + searchConfig.writePath + filename;
            await fs.writeJson(fullPath, results);
            console.log(fullPath + ' write file success!')
            return true;
        } catch (err) {
            console.error(err)
            return false;
        }
    },
    /**
     * @param filename string
     */
    deleteFile: async function (filename) {
        if (filename) {
            let fullpath = __dirname + "/../" + searchConfig.writePath + filename;
            await del([fullpath], {
                force: true
            });
        }
    },
    /**
     * @param req object - express request object
     * @param res object - express response object
     */
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
    /**
     * @param req status - boolean
     * @param res object - express response object
     * @param error object - from searchinit try/catch
     */
    userMessage: function (status, res, message, error) {
        let uxUpdate = {};
        if (status) {
            uxUpdate.message = message;
        } else {
            uxUpdate.message = error;
        }
        res.json(uxUpdate);
    }
}

module.exports = searchApp;