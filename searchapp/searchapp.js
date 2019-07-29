const _ = require('lodash');
const fs = require("fs-extra");
const del = require('del');
const fetch = require("node-fetch");
const date = require('date-and-time');
const {
    RateLimit
} = require('async-sema'); // for throttling API calls
const searchConfig = require('./config/searchconfig');

const searchApp = {
    /**
     * public interface for express endpoints
     * calls methods based on express endpoint
     * returns message to express
     *
     * @param {object} res response object from express 
     * @param {object} req response object from express
     * @param {string} verb create/update/delete/
     */
    apiCtrl: async function(req, res, verb) {
        if (verb == "create") {
            let status = await this.createNewIndex();
            let message = "New index created";
            this.userMessage(status, res, message);
            return;
        }
        if (verb == "update") {
            let status = await this.updateFile(req);
            let message = "file updated";
            this.userMessage(status, res, message);
            return;
        }
    },
    /**
     * intiates fresh search index
     */
    createNewIndex: async function () {
        try {
            const urlArray = await this.makeUrlArray();
            const results = await this.fetchUrlArray(urlArray);
            return await this.processResults(results);
        } catch (error) {
            console.log(error);
            return false;
        }
    },
    /**
     * controls cusomisations of results, addition of timestamp and writing of results
     * returns true if writing of file is sucessful
     * 
     * @param {array} results
     */
    processResults: async function (results) {
        const customResults = await this.customResults(results);
        const resultsWithTimestamp = this.addTimeStamp(customResults);
        return await this.writeFile(resultsWithTimestamp, searchConfig.indexFilename);
    },
    /**
     * returns an array of urls based on teams.json
     */
    makeUrlArray: async function () {
        const teams = await this.readJsonFile(searchConfig.teamsFilename);
        let a = [];
        teams.forEach(function (team) {
            var apiUrl = `${searchConfig.apiBase}urlPrefix=${team.url}&resultsPerPage=${searchConfig.resultsNum}`;
            let keywords = _.uniq(team.keywords); // remove duplicate keywords
            for (i = 0; i < keywords.length; i++) {
                a.push(apiUrl + "&q=" + keywords[i]);
            }
        });
        return a;
    },
    /**
     * returns an array of promises, each promise being a url fetch
     * 
     * @param {array} urlArray array of urls
     */
    fetchUrlArray: async function (urlArray) {
        console.log("Start crawling search API");
        const lim = RateLimit(searchConfig.throttle);
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
     * replaces url/titles in results with those matching keywords in custom.json 
     * returns array of customised results
     * 
     * @param {array} results initial search results
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
     * adds a timestamp to a json node and adds results to JSON node 
     * returns json
     * 
     * @param {array} customResults
     */
    addTimeStamp: function (customResults) {
        const resultsWithTS = [];
        const i = {};
        const now = new Date();
        let lastWriteTime = date.format(now, 'hh:mm A [GMT]Z', true);
        let lastWriteDate = date.format(now, 'ddd MMM DD YYYY');
        i.created = lastWriteDate + " at " + lastWriteTime;
        i.searchdoc = customResults;
        resultsWithTS.push(i);
        return resultsWithTS;
    },
    /**
     * Tidy raw search results, adds id number, adds/removes fields 
     * 
     * @param {object} result 
     * @param {string} url 
     * @param {int} index  
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
     * Reads a json file, returns json
     * 
     * @param {string} filename
     */
    readJsonFile: async function (filename) {
        let fullPath = __dirname + "/../" + searchConfig.writePath + filename;
        const json = await fs.readJson(fullPath).catch(err => {
            throw new Error(err);
        });
        return json;
    },
    /**
     * writes data to a file, returns truthy value if successful
     * 
     * @param {array} results array of objects
     * @param {string} filename
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
     * Deletes file
     * 
     * @param {string} filename 
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
     * Updates a json file with data from frontend json editor
     * 
     * 
     * @param {object} req express request object
     */
    updateFile: async function (req) {
        let filename = req.body.filename;
        await this.deleteFile(filename);
        await this.writeFile(JSON.parse(req.body.data), filename);

        // depending on file updated, trigger new index crawl
        // or just cusomise current index
        if (filename == "custom.json" ) {
            const jsonFile = await this.readJsonFile(searchConfig.indexFilename);
            return await this.processResults(jsonFile[0].searchdoc);
        }
        if (filename == "teams.json") {
            return await this.createNewIndex();
        }
    },

    /**
     * returns a message object using express response
     * 
     * @param {boolean} status
     * @param {object} res express response 
     * @param {string} message
     * @param {object} error
     */
    userMessage: function (status, res, message) {
        let uxUpdate = {};
        if (status) {
            uxUpdate.message = message;
        } else {
            uxUpdate.message = "opps somethings went wrong";
        }
        res.json(uxUpdate);
    }
}

module.exports = searchApp;