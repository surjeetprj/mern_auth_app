const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({path: "./config.env"});
const app = require("./app");
// console.log(process.env.NODE_ENV);

const db = process.env.DB;
// connect application to database
mongoose
.connect(db)
.then(()=> {
    console.log("DB connection successful");
})
.catch((err)=> {
    console.log("mongodb error ", err);
});

const port = process.env.PORT || 3000

app.listen(port,()=>{
    console.log(`App running on port ${port}`);
});