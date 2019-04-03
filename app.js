require('dotenv').config();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const favicon = require('serve-favicon');
const hbs = require('hbs');
const mongoose = require('mongoose');
const subdomain = require('express-subdomain')
const logger = require('morgan');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');

const { DBURL } = process.env;
mongoose.Promise = Promise;
mongoose
  .connect(DBURL, { useNewUrlParser: true })
  .then(() => {
    console.log(`Connected to Mongo on ${DBURL}`)
  }).catch(err => {
    console.error('Error connecting to mongo', err)
  });

const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();

// Middleware Setup
var whitelist = [
  'http://localhost:3000',
  'http://admin.ribodev.com:3000',
  'http://ribodev.com:3000',
  'https://ribo-cap.herokuapp.com',
  'http://ribo-cap.herokuapp.com',
  'http://www.ribocapital.com'
  
];
var corsOptions = {
  origin: function(origin, callback){
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
    maxAge: 2419200000
  },
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));
require('./passport')(app);


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));



// default value for title local
app.locals.title = 'Express - Generated with IronGenerator';

const authRouter = require('./routes/auth');
const loanRouter = require('./routes/loan');
const summaryRouter = require('./routes/summary');
const transactionRouter = require('./routes/transaction');
const genericCrud = require('./routes/genericCRUD');

app.use('/api/auth', authRouter);
app.use('/api/test/loan', loanRouter);
app.use('/api/test/transaction', transactionRouter);
app.use('/api/test/summary', summaryRouter);
app.use('/api/test/loan', genericCrud(require('./models/Loan')));
app.use('/api/test/client', genericCrud(require('./models/User')));
app.use('/api/test/investment', genericCrud(require('./models/Investment')));
app.use('/api/test/borrower', genericCrud(require('./models/User')));
app.use('/api/test/investor', genericCrud(require('./models/User')));
app.use('/api/test/loanSchedule', genericCrud(require('./models/LoanSchedule')));
app.use('/api/user', genericCrud(require('./models/User')));

app.use((req, res, next) => {
  res.sendFile(__dirname + "/public/index.html");
});



module.exports = app;