const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const constants = require('./constants')
var Float = require('mongoose-float').loadType(mongoose, 4);


const transactionSchema = new Schema({
  _loan: {
    type: Schema.ObjectId,
    ref: 'Loan'
  },
  _investor: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  _loanSchedule: {
    type: Schema.ObjectId,
    ref: 'loanSchedule'
  },
  _payment: {
    type: Schema.ObjectId,
    ref: 'Payment'
  },
  date: Date,
  cashAccount: {
    type: String,
    enum: ['RBPERU', 'GCUS', 'GFUS', 'GCDR']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['DOP', 'USD', 'PEN']
  },
  concept: {
    type: String,
    enum: Object.keys(constants.txConcepts)
  },
  amount: {
    type: Float,
    default: 0
  },
  debit: {
    type: Float,
    default: 0
  },
  credit: {
    type: Float,
    default: 0
  },
  comment: String
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});


transactionSchema.pre('save', function (next) {
  console.log(this.amount)
  if (constants.txConcepts[this.concept] == 'CREDIT') {
    this.credit = this.amount
  } else {
    this.debit = this.amount
  }
  next();
});



const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;