require('dotenv').config();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const favicon = require('serve-favicon');
const hbs = require('hbs');
const mongoose = require('mongoose');
const logger = require('morgan');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');
const sslRedirect = require('heroku-ssl-redirect');

const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();

// DB start
require('./db')


// Middleware Setup
var whitelist = [
  'http://localhost:3000',
  'http://admin.ribodev.com:3000',
  'http://ribodev.com:3000',
  'https://ribo-cap.herokuapp.com',
  'http://ribo-cap.herokuapp.com',
  'https://ribo-cap-staging.herokuapp.com',
  'http://ribo-cap-staging.herokuapp.com',
  'http://www.ribocapital.com',
  'https://www.ribocapital.com'
];

var corsOptions = {
  origin: function (origin, callback) {
    var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
    callback(null, originIsWhitelisted);
  },
  credentials: true
};
app.use(cors(corsOptions));


// Middleware Setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(sslRedirect())
// Express View engine setup

app.use(require('node-sass-middleware')({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  sourceMap: true
}));

app.use(session({
  secret: 'angular auth passport secret shh',
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    maxAge: 7200000
  },
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  })
}));

require('./passport')(app);


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));



// default value for title local
app.locals.title = 'Express - Generated with IronGenerator';

const authRouter = require('./routes/auth');
const summaryRouter = require('./routes/summary');
const reportingRouter = require('./routes/reporting');
const transactionRouter = require('./routes/transaction');
const genericCrud = require('./routes/genericCRUD');
const companyCrud = require('./routes/company');
const investorCrud = require('./routes/investor');
const loanCrud = require('./routes/loan');
const collateralCrud = require('./routes/collateral');
const paymentCrud = require('./routes/payment')
const financialsRouter = require('./routes/financials');
const stRouter = require('./routes/scheduleTransform');

app.use('/api/auth', authRouter);
app.use('/api/loan', loanCrud(require('./models/Loan')));
app.use('/api/transaction', transactionRouter);
app.use('/api/test/summary', summaryRouter);
app.use('/api/st', stRouter);
app.use('/api/reporting', reportingRouter(require('./models/User')));
app.use('/api/payment', paymentCrud(require('./models/Payment')));
app.use('/api/collateral', collateralCrud(require('./models/Collateral')));
app.use('/api/company', companyCrud(require('./models/Company')));
app.use('/api/investor', investorCrud(require('./models/User')));
app.use('/api/financials', financialsRouter(require('./models/Transaction')));
app.use('/api/client', genericCrud(require('./models/User')));
app.use('/api/test/investment', genericCrud(require('./models/Investment')));
app.use('/api/test/borrower', genericCrud(require('./models/User')));
app.use('/api/test/loanSchedule', genericCrud(require('./models/LoanSchedule')));
app.use('/api/user', genericCrud(require('./models/User')));

app.use((req, res, next) => {
  res.sendFile(__dirname + "/public/index.html");
});



module.exports = app;