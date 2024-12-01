const mongoose = require("mongoose");
const validator = require('validator');
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true,"Please provide username"],
        trim: true,
        minlenght: 3,
        maxlength: 30,
        index: true,
    },
    email: {
        type:String,
        required:[true,"please provide an email"],
        unique: true,
        lowercase: true,
        validate:[validator.isEmail,"Please Provide a valid email"],
    },
    password:{
        type:String,
        required:[true,"please providea password"],
        minlength: 8,
        select:false, // do not show password at the time of response
    },
    passwordConfirm:{
        type:String,
        require:[true,"please confirm your password"],
        validate:{
            validator: function (el){
                return el === this.password;
            },
            message:"Password are not same",
        },
    },
    isVerified:{
        type:Boolean,
        default: false,
    },
    otp:{
        type:String,
        default:null
    },

    otpExpire:{
        type:Date,
        default:null,
    },

    resetPasswordOTP:{
        type:String,
        default:null,
    },

    resetPasswordOTPExpires:{
        type:Date,
        default:null,
    },
    createdAt:{
        type:Date,
        default:Date.now,
    },
},{
    timestamps:true,
});

// this function encrypt password before saving to the database
userSchema.pre("save",async function (next) {
    if(!this.isModified("password")) return next(); // no need to encrypt if password is not midified.

    this.password = await bcrypt.hash(this.password,12); // encrypt the password

    this.passwordConfirm = undefined;
    
    next();   
});

userSchema.methods.correctPassword = async function(password,userPassword){
    return await bcrypt.compare(password,userPassword);
}

const User = mongoose.model("User",userSchema);
module.exports = User;