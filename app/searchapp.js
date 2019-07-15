
const searchApp = {
    cleanDir: async function() {
        // delete current search document file before creation of new one.
        // await del([`${searchConfig.fileName}*.json`], {
        //     force: true
        // });
        let test = {
            "team": "careers",
            "url": "https://warwick.ac.uk/services/careers",
            "keywords": ["careers appointments", "careers advice", "CVs", "careers", "cover letters", "careers fair", "work experience", "jobs", "career guidance", "vacancies", "applications", "job interviews", "advisor", "careers advisor", "careers advice", "internships", "Career planning", "job sectors", "further study", "WSI", "warwick summer internships", "myAdvantage", "assessment centres", "psychometric and aptitude tests", "graduate outcomes", "workshops", "myadvantage", "careerhub", "employability", "Applying for jobs", "job search", "job application", "strengthes", "personality types", "careers advisor"]
        }

        return test;
    }
}


module.exports = searchApp;

