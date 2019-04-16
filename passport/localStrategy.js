const User = require('../models/User');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

passport.use(new LocalStrategy((email, password, next) => {

    User.findOne({email})
    .populate('loans')
    .then( user =>{
        if (!user) throw new Error("Incorrect Username");
        if (!bcrypt.compareSync(password, user.password)) throw new Error("Incorrect Password");
        
        return next(null, user);
    })
    .catch(e => {
        next(null, false, {
            message: e.message
        })
    })
}));