const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const globalErrorHanler = require("./controller/errorController");
const userRouter = require('./routes/userRouters');
const AppError = require("./utils/appError");

const app = express();

app.use(cookieParser());

app.use(
    cors({
        origin: ["http://localhost:3000"],
        credentials : true,
    })
);

app.use(express.json({limit: "10kb"}));
 
// User api urls
app.use("/api/v1/users",userRouter); 

app.all("*",(req,res,next)=>{
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));

});
app.use(globalErrorHanler);

module.exports = app;