require("dotenv")

const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        type: 'OAuth2',
        user: 'prestamo@ribocapital.com',
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: process.env.ACCESS_TOKEN
    }
})

const sendMail= (to,sub,msg)=>{
  return transporter.sendMail({
    from: 'RIBO <prestamo@ribocapital.com>',
    to,
    subject:sub,
    html:msg
  })
  .then(info=>console.log(info, 'SUCCESS'))
  .catch(error=>console.log(error, 'MAIL TRANSPORTER'))
}

module.exports=sendMail; 