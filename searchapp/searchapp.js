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
    createNewIndex: async function (res) {
        try {
            const urlArray = await this.makeUrlArray();
            const results = await this.fetchUrlArray(urlArray, res);
            const status = await this.processResults(results);
            this.userMessage(status, res, "new index written");
        } catch (error) {
            this.userMessage(false, res, "error try again", error);
            console.log(error);
        }
    },
    processResults: async function (results) {
        const customResults = await this.customResults(results);
        const resultsWithTimestamp = this.addTimeStamp(customResults);
        let status = await this.writeFile(resultsWithTimestamp, searchConfig.indexFilename);
        return status;
    },
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
     * @param res Response object from express
     */
    fetchUrlArray: async function (urlArray, res) {
        console.log("Start crawling search API using url prefixes and keywords");
        const lim = RateLimit(searchConfig.throttle); // throttle api calls
        const allResults = urlArray.map(async (url, index) => {
            await lim();
            return await fetch(url)
                .then(res => res.json())
                .then(json => {
                    return this.resultTidy(json.results[0], url, index);
                }).catch(err => {
                    throw new Error(err);
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
        const teams = await fs.readJson(fullPath).catch(err => {
            throw new Error(err);
        });
        return teams;
    },
    /**
     * @param results array of objects
     * @param filename string
     */
    writeFile: async function (results, filename) {
        await this.deleteFile(filename);
        let fullPath = __dirname + "/../" + searchConfig.writePath + filename;
        await fs.writeJson(fullPath, results).catch(err => {
            throw new Error(err);
        })
        console.log(fullPath + ' write file success!')
        return true;
    },
    /**
     * @param filename string
     */
    deleteFile: async function (filename) {
        if (filename) {
            let fullpath = __dirname + "/../" + searchConfig.writePath + filename;
            await del([fullpath], {
                force: true
            }).catch(err => {
                throw new Error(err);
            });
        }
    },
    /**
     * @param req object - express request object
     * @param res object - express response object
     */
    updateFile: async function (req, res) {
        let filename = req.body.filename;
        await this.deleteFile(filename);
        await this.writeFile(JSON.parse(req.body.data), filename);
        if (req.body.crawl) {
            this.createNewIndex(res);
        } else { // no crawl just update current index
            const jsonFile = await this.readJsonFile(searchConfig.indexFilename);
            const status = await this.processResults(jsonFile[0].searchdoc);
            this.userMessage(status, res, "File saved and new index generated");
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
            uxUpdate.message = message + error;
        }
        res.json(uxUpdate);
    }
}

module.exports = searchApp;