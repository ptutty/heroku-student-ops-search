const searchConfig = {
    "apiBase": "https://warwick.ac.uk/ajax/lvsch/query.json?",
    "throttle": 50, // rps so as not to over load server API servers. 
    "resultsNum": 1, // get only 1st result from search API results
    "overRide": false, // overwrite search data with manual file: searchoverrides.json
    "writePath": "public/data/", // where to save final compiled index file
    "fileName": "docs_to_index.json" // filename used for final compiled search index used in client side autocomplete
};
module.exports = searchConfig;
