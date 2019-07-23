/* vue js */
var app = new Vue({
    el: '#app',
    data() {
        return {
            message: null,
            lastIndex: null
        }
    },
    methods: {
        createIndex: async function (event) {
            this.message = "Polling API endpoints.. please wait"
            try {
                const response = await axios.get('/results');
                this.message = response.data.message;
                this.lastIndex = response.data.lastIndex;
            } catch (error) {
                this.message = error
            }

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