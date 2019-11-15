require('dotenv').config();
const {
  DBURL,
  DBURL_DEV
} = process.env;
const mongoose = require('mongoose');
require("./models/Commission")

const db = mongoose.connection;

db.on('connecting', function () {
  console.log('Connecting to MongoDB...');
});

db.on('error', function (error) {
  console.error('Error in MongoDb connection: ' + error);
  mongoose.disconnect();
});

db.on('connected', function () {
  console.log('MongoDB connected!');
});

db.once('open', function () {
  console.log('MongoDB connection opened!');
});

db.on('reconnected', function () {
  console.log('MongoDB reconnected!');
});

db.on('disconnected', function () {
  console.log('MongoDB disconnected!');
  mongoose.connect(DBURL, {
    auto_reconnect: true,
    useNewUrlParser: true,
    useFindAndModify: false

  });
});

process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});

const dburi = DBURL ? DBURL : DBURL_DEV

mongoose.connect(dburi, {
    auto_reconnect: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then((r) => {
    console.log(`Connected to Mongo on ${dburi}`)
  })
  .catch(err => {
    console.error('Error connecting to mongo', err)
  });