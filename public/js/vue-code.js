/* vue js */
var app = new Vue({
    el: '#app',
    data() {
        return {
            message: null
        }
    },
    methods: {
        createIndex: function (event) {
            this.message = "Polling API endpoints.. please wait"
            axios
                .get('/results')
                .then(response => (this.message = response.data))
        },
        updateFile: function (updatedJson, filename, crawl) {
            this.message = "data updated and saved";
            axios.post('/update', {
                data: updatedJson,
                filename: filename,
                crawl: crawl
            });
        }
    }
})