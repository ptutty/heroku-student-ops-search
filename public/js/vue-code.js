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
            console.log("creating index");
            this.message = "Polling API endpoints.. please wait"
            axios
                .get('/results')
                .then(response => (this.message = response.data))
        },
        saveSeedEdits: function (updatedJson) {
            axios.post('/update', {
                data: updatedJson, 
            });

        }
    }
})