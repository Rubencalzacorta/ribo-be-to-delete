const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const LoanSchedule = require('./LoanSchedule')
const Investment = require('./Investment')
const User = require('./User')

const loanSchema = new Schema({
  _borrower: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  investors: [{
    type: Schema.ObjectId,
    ref: 'Investment'
  }],
  loanSchedule: [{
    type: Schema.ObjectId,
    ref: 'LoanSchedule'
  }],
  commission: [{
    type: Schema.ObjectId,
    ref: 'Commission'
  }],
  collateral: [{
    type: Schema.ObjectId,
    ref: 'Collateral'
  }],
  collateralType: String,
  collateralValue: Number,
  collateralDescription: String,
  period: String,
  totalPaid: {
    type: Number,
    default: 0
  },
  IRR: Number,
  paidback: {
    type: Boolean,
    default: false
  },
  interestEarned: Number,
  PaybackPeriod: Number,
  capitalRemaining: Number,
  interest: Number,
  duration: Number,
  capital: Number,
  startDate: Date,
  paymentDate: Date,
  loanType: String,
  useOfFunds: String,
  currency: {
    type: String,
    default: "USD",
    enum: ['DOP', 'USD', 'PEN']
  },
  status: {
    type: String,
    default: "OPEN",
    enum: ['OPEN', 'CLOSED']
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

var autoPopulateLoan = function (next) {
  this.populate('_borrower');
  this.populate('loanSchedule');
  this.populate('investors');
  next();
};

loanSchema
  .pre('findOne', autoPopulateLoan)
  .pre('find', autoPopulateLoan)
  .pre('findByIdAndUpdate', autoPopulateLoan);

loanSchema.pre('remove', function (next) {

  const User = require('./User')
  const LoanSchedule = require('./LoanSchedule')
  const Investment = require('./Investment')
  const Transaction = require('./Transaction')

  LoanSchedule.deleteMany({
      _loan: this._id
    }, next).then(() => {
      console.log('Loan Schedule deleted')
    })
    .then(e => {
      Investment.deleteMany({
        _loan: this._id
      }, next).then(() => {
        console.log('Invesments deleted')
      })
    })
    .then(e => {
      Transaction.deleteMany({
        _loan: this._id
      }, next).then(() => {
        console.log('Transactions deleted')
      })
    })
    .then(e => {
      User.updateOne({
        _loan: this._loan
      }, {
        $pull: {
          'loans': this._id
        }
      }, next).then(() => {
        console.log('User updated')
      })
    })
    .catch(err => next(new Error('Failed to execute "pre" remove hook')))

});

loanSchema.pre('save', function (next) {
  this.capitalRemaining = this.get('capital');
  next();
});

const Loan = mongoose.model('Loan', loanSchema);
module.exports = Loan;