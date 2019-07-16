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
            this.message = "collecting results"
            // axios
            //     .get('/results')
            //     .then(response => (this.message = response))
        }
    }
})
