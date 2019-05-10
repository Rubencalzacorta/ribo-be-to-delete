const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const LoanSchedule = require('./LoanSchedule')
const Investment = require('./Investment')
const User = require('./User')

const loanSchema = new Schema({
  _borrower: { type: Schema.ObjectId, ref: 'User' },
  investors: [{ type: Schema.ObjectId, ref: 'Investment' }],
  loanSchedule: [{ type: Schema.ObjectId, ref: 'LoanSchedule' }],
  collateralType: String,
  collateralValue: Number, 
  collateralDescription: String,
  period: String,
  totalPaid: { type: Number, default: 0},
  capitalRemaining: Number, 
  interest: Number,
  duration: Number, 
  capital: Number,
  startDate: Date,
  paymentDate: Date,
  loanType: String,
  useOfFunds: String,
  status: {type: String, default: "OPEN", enum: ['OPEN', 'CLOSED']},
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

var autoPopulateLoan = function(next) {
  this.populate('_borrower');
  this.populate('loanSchedule');
  this.populate('investors');
  next();
};

loanSchema
  .pre('findOne', autoPopulateLoan)
  .pre('find', autoPopulateLoan)
  .pre('findByIdAndUpdate', autoPopulateLoan);

loanSchema.pre('remove', function(next) {
  
  const User = require('./User')
  const LoanSchedule = require('./LoanSchedule')
  const Investment  = require('./Investment')
  const Transaction  = require('./Transaction')

  LoanSchedule.deleteMany({ _loan: this._id })
    .then( e => { Investment.deleteMany({ _loan: this._id }, next)})
    .then( e => { Transaction.deleteMany({_loan: this._id }, next)})
    .then( e => { User.updateOne({_loan: this._loan}, {$pull:{'loans':this._id}}, next)})
    .catch( err => next(new Error('Failed to execute "pre" remove hook')))

}); 

loanSchema.pre('save', function (next) {
  this.capitalRemaining = this.get('capital'); 
  next();
});

const Loan = mongoose.model('Loan', loanSchema);
module.exports = Loan;

