const User = require("../model/userModel");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");
const generateOtp = require("../utils/generateOtp");
const AppError = require("../utils/appError");
const jwt = require("jsonwebtoken")

const signToken = (id)=>{
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:process.env.JWT_EXPIRES_IN,
    });

};
const createSendtoken = (user,statusCode,res,message)=>{
    const token = signToken(user._id);

    const cookieOptions = {
        expires:new Date (Date.now() + process.env.JWT_COOKIE_EXPIRES_IN *24 *60 *60*1000
    ),
    httpOnly : true,
    secure: process.env.NODE_ENV === 'production', // only secure in production
    sameSite :process.env.NODE_ENV === 'production' ? 'none':'Lax'
    };

    res.cookie("token",token,cookieOptions);

    user.password=undefined;
    user.passwordConfirm=undefined;
    user.otp=undefined;

    res.status(statusCode).json({
        status:'success',
        message,
        token,
        data:{
            user,
        }
    });
};

// signup
exports.signup = catchAsync(async(req,res,next)=>{
    const {email,password,passwordConfirm,username} =req.body;

    const existingUser = await User.findOne({email});

   if(existingUser) return next(new AppError("Email already registered", 400));

    const otp = generateOtp();

    const otpExpires = Date.now() + 24*60*60*1000; // One day
    
    const newUser = await User.create({
        username,
        email,
        password,
        passwordConfirm,
        otp,
        otpExpires,
    });
    
    
    try {
        await sendEmail({
            email:newUser.email,
            subject:"OTP for email verification",
            html:`<h1>Your OTP is : ${otp}</h1>`,
        });

       createSendtoken( newUser,200,res,"Registration successful");
        
    } catch (error) {
        await User.findByIdAndDelete(newUser.id); // if email sending fails we delete the user from Database
        return next(new AppError("There is an erro sending the email. Try again",500)
    );
    }
});

// verification
exports.verifyAccount = catchAsync(async(req,res,next)=>{
    const {otp} = req.body;

    if(!otp){
        return next(new AppError("Otp is missing", 400));
    }

    const user = req.user;

    if(user.otp !== otp){
        return next(new AppError("Invalid OTP", 400));
    }

    if(Date.now() > user.otpExpires){
        return next(new AppError("Otp has expired. Please request a new OTP",400));
    }

    user.isVerified = true;
    user.otp=undefined;
    user.otpExpires=undefined;

    await user.save({ validateBeforeSave: false });

    createSendtoken(user,200,res,"Email has been verified.");
    
});

// Resend OTP
exports.resendOTP = catchAsync(async(req,res,next)=>{
    const {email} = req.user;
  

    if(!email){
        return next(new AppError("Email is required to resend otp",400));
    }

    const user = await User.findOne({email});

    if(!user){
        return next(new AppError("User not Found",404));
    }

    if(user.isVerified){
        return next(new AppError("this account is already verified", 400));
    }

    const newOtp = generateOtp();
    user.otp=newOtp;
    user.otpExpire = Date.now() + 24*60*60*1000;

    await user.save({validateBeforeSave:false});

    try{
        await sendEmail({
            email:user.email,
            subject:"Resend otp for email varification",
            html:`<h1>Your New otp is : ${newOtp}</h1>`,
        });
        res.status(200).json({
            status:'success',
            message:"A new otp has send to your email",
        });
    }catch(error){
        user.opt=undefined;
        user.otpExpire=undefined;
        await user.save({validateBeforeSave:false});
        return next(new AppError('There is an error sending the email ! Plese ty again',500));
    }

});

// Login
exports.login = catchAsync(async(req,res,next)=>{
    const {email,password} = req.body;

    if(!email || !password){
        return next(new AppError("Please provide email and password",400));
    }

    const user = await User.findOne({email}).select('+password');

    // Compare the password with the password save in the database8
    if(!user || !(await user.correctPassword(password,user.password))){
        return next(new AppError("incorrect Email or password"));
    }

    createSendtoken(user,200,res,"Login Successful");
});
// Logout
exports.logout = catchAsync(async (req,res,next) => {
    res.cookie("token", "loggedout",{
        expires: new Date(Date.now()+ 10 * 1000),
        httpOnly:true,
        secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
        status:"success",
        message:"Logged out successfull",
    });
});

// Forget Password
exports.forgetPassword = catchAsync(async(req,res,next)=>{
    const {email} = req.body;
    const user = await User.findOne({email});

    if(!user){
        return next(new AppError("No user found", 404));
    }

    const otp = generateOtp();

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 300000; // 5 minutes

    await user.save({validateBeforeSave:false});

    try {
        await sendEmail({
            email:user.email,
            subject:"Your password Reset Otp (valid for 5 min.)",
            html:`<h1> Your password reset Otp: ${otp}</h1>`,
        });

        res.status(200).json({
            status:'success',
            message: "password reset otp is send to your email",
        });
    } catch (error) {
        user.resetPasswordOTP=undefined;
        user.resetPasswordOTPExpires=undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                "there was an error sending the email. Please try again later"
            )   
        );
    }
});

// Reset Password
exports.resetPassword = catchAsync(async (req,res,next) => {
    const {email,otp,password,passwordConfirm} = req.body;

    const user = await User.findOne({
        email,
        resetPasswordOTP: otp,
        resetPasswordOTPExpires: {$gt:Date.now()}, // $gt selects those documents where the value of the specified field is greater than (i.e. >) the specified value.
    });

    if(!user) return next(new AppError("No User found",400));

    user.password=password;
    user.passwordConfirm=passwordConfirm;
    user.resetPasswordOTP=undefined;
    user.resetPasswordOTPExpires=undefined;

    await user.save();

    createSendtoken(user,200,res,"Password reset successfully");
});