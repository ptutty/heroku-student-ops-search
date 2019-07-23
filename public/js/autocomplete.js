var data = null;
var results, uniqresults;
var index = new FlexSearch({
    encode: "advanced",
    tokenize: "reverse",
    suggest: false,
    doc: {
        id: "id",
        field: [
            "title",
            "keyword"
        ]
    }
});
$.ajax({
    'async': false,
    'global': false,
    'url': "../data/docs_to_index.json",
    'dataType': "json",
    'success': function (res) {
        data = res[0].searchdoc;
        for (var i = 0; i < data.length; i++) {
            index.add(data[i]);
        }
    }
});

var suggestions = document.getElementById("suggestions");
var userinput = document.getElementById("userinput");
userinput.addEventListener("input", show_results, true);

function show_results() {
    var value = this.value;
    results = index.search(value, 5);

    /* removes duplicate results by title */
    uniqresults = _.uniqBy(results, 'title');

    var entry;
    var childs = suggestions.childNodes;
    var len = uniqresults.length;
    var i = 0;

    if (len > 0) {
        clearOldResults();
        for (; i < len; i++) {
            entry = childs[i];
            if (!entry) {
                entry = document.createElement("div");
                suggestions.appendChild(entry);
            }
            entry.innerHTML = `<a href=${uniqresults[i].link} > ${uniqresults[i].title} </a>`;
        }
    } else { 
        clearOldResults();
    }
}

function clearOldResults(){
    while (suggestions.firstChild) {
        suggestions.removeChild(suggestions.firstChild);
    }
}