// to avoid writing try catch bolck again and again..
module.exports = (fn)=>{
    return(req,res,next)=>{
        fn(req,res,next).catch(next);
    };
};
