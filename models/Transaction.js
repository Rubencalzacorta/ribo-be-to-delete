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
    enum: constants.txConcepts
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


const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;