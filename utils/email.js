const nodemailer = require('nodemailer');


const sendEmail =async(options)=>{
   const transporter = nodemailer.createTransport({
    service:'Gmail',

    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS,
    },
   }); 

   const mailOPtions = {
    from:`dev.psurjeet@gmail.com`,
    to:options.email,
    subject:options.subject,
    html:options.html,
   };

const res =await transporter.sendMail(mailOPtions);
};

module.exports=sendEmail;