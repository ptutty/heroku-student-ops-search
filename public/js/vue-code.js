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
        saveSeedEdits: function (updatedJson) {
            this.message = "Team data updated";
            axios.post('/update', {
                data: updatedJson, 
            });
        }
    }
})