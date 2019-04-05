const User = require('../models/User');
const passport = require('passport');

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .populate('loans').exec()
        .then(function(user) {
        done(null, user);
        }, done)
    ;

          
});

// passport.deserializeUser(function(id, done) {
//     User.findById(id)
//     .populate('companyRoles._company', ['name', '_id'])
//     .run(function (err, user) {
//         done(err, user);
//      });
// });