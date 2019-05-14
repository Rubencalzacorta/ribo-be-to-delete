const express = require('express');
const router  = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const passport = require('passport');
const sendMail = require("../mail/mail");
const hbs = require("handlebars");
const fs = require("fs");


const login = (req, user) => {
  return new Promise((resolve,reject) => {
    req.login(user, err => {
      if(err) {
        reject(new Error('Something went wrong --- aqui'))
      }else{
        resolve(user);
      }
    })
  })
}


// SIGNUP
router.post('/signup', (req, res, next) => {

  const { 
          email, 
          password, 
          firstName, 
          lastName
        } = req.body;

 

  // Check for non empty user or password
  if (!email || !password){
    next(new Error('You must provide valid credentials'));
  }

  // Check if user exists in DB
  User.findOne({ email })
  .then( foundUser => {
    console.log('asd')
    if (foundUser) throw new Error('email already exists');

    const salt     = bcrypt.genSaltSync(10);
    const hashPass = bcrypt.hashSync(password, salt);
    const confirmationCode = encodeURIComponent(bcrypt.hashSync(email, salt));

    

    return new User({
      email,
      password: hashPass,
      firstName, 
      lastName,
      confirmationCode
    })
    .save()
    .then( (savedUser) => { 

      let confirmationCode = savedUser.confirmationCode
      const templateStr = fs.readFileSync("./mail/template.hbs").toString();
      const template = hbs.compile(templateStr);
      const html = template({ confirmationCode, firstName, lastName });
      const sub = "Confirmación de cuenta - RIBO";

      sendMail(email,sub,html) 
      return savedUser

    })
  })
  .then( savedUser => login(req, savedUser)) // Login the user using passport
  .then( user => res.json({status: 'signup & login successfully', user})) // Answer JSON
  .catch(e => next(e));
});

router.get('/confirmation/:code', (req, res, next) => {
  let { code } = req.params

  User.findOneAndUpdate(
    { confirmationCode: code },
    { status: "ACTIVE" }
  ).then( (user) => {
    if (user.status === 'ACTIVE'){
      res.status(200).json({confirmed: true}) 
    } else {
      res.status(304).json({confirmed: false}) 
    }
  })
  .catch(e=> next(e));
})


router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, theUser, failureDetails) => {
    
    // Check for errors
    if (err) next(new Error('Something went wrong')); 
    if (!theUser) next(failureDetails)

    // Return user and logged in
    login(req, theUser).then(user => res.status(200).json(req.user));

  })(req, res, next);
});

router.get('/resend-confirmation', (req, res, next) => {
  let { email, _id } = req.user

  const salt     = bcrypt.genSaltSync(10);
  const confirmationCode = encodeURIComponent(bcrypt.hashSync(email, salt))
  let update = { confirmationCode: confirmationCode };
  User.findByIdAndUpdate(_id, update, {new:true})
    .then( user => {
      let {confirmationCode, firstName, lastName} = user
      const templateStr = fs.readFileSync("./mail/template.hbs").toString();
      const template = hbs.compile(templateStr);
      const html = template({ confirmationCode, firstName, lastName });
      const sub = "Activación de cuenta - RIBO";

      sendMail(email,sub,html) 
      return user
    })
    .then( user => res.status(200).json({status: 'success', user}))
    .catch(e => next(e));
})

router.get('/currentuser', (req,res,next) => {

  if(req.user){
    res.status(200).json(req.user);

  }else{
    next(new Error('Not logged in'))
  }
})


router.get('/logout', (req,res) => {
  req.logout();
  res.status(200).json({message:'logged out'})
});




router.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
})

module.exports = router;
