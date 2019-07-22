const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const investmentSchema = new Schema({
  _investor: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  _loan: {
    type: Schema.ObjectId,
    ref: 'Loan'
  },
  currency: {
    type: String,
    default: "USD",
    enum: ['DOP', 'USD', 'PEN']
  },
  pct: Number,
  amount: Number,
  cashAccount: String
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

const Investment = mongoose.model('Investment', investmentSchema);
module.exports = Investment;