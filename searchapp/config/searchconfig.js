const searchConfig = {
    "apiBase": "https://warwick.ac.uk/ajax/lvsch/query.json?",
    "throttle": 10, // rps so as not to over load server API servers. 
    "resultsNum": 1, // get only 1st result from search API results
    "overRide": true, // overwrite search data with manual file: searchoverrides.json
    "writePath": "public/data/", // where to save final compiled index file
    "indexFilename": "docs_to_index.json", // filename used for final compiled search index used in client side autocomplete
    "customFilename": "custom.json", // filename of custom keywords
    "teamsFilename": "teams.json" // filename of default keyword list
};
module.exports = searchConfig;

