/* vue js */
var app = new Vue({
    el: '#app',
    data() {
        return {
            message: null
        }
    },
    methods: {
        createIndex: async function (event) {
            this.message = "Generating index ... please wait"
            try {
                let response = await axios.get('/create');
                this.message = response.data.message;
            } catch (error) {
                this.message = error
            }

        },
        updateFile: async function (updatedJson, filename, crawl) {
            this.message = "Saving data ...and reindexing";
            console.log("updatefile");
            let payload = {};
            payload.data = updatedJson;
            payload.filename = filename;
            payload.crawl = crawl;
            try {
                let response = await axios.post('/update', payload);
                this.message = response.data.message;
            } catch (error) {
                this.message = error
            }

        }
    }
})