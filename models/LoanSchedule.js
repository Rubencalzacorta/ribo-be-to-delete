const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const loanScheduleSchema = new Schema({
  _loan: {
    type: Schema.ObjectId,
    ref: 'Loan'
  },
  date: Date,
  interest: Number,
  principal: Number,
  payment: Number,
  balance: Number,
  status: {
    type: String,
    enum: ['DISBURSTMENT', 'PENDING', 'DUE', 'OVERDUE', 'PAID', 'OUTSTANDING', 'CLOSED']
  },
  currency: {
    type: String,
    default: "USD",
    enum: ['DOP', 'USD', 'PEN']
  },
  tracking: String,
  cashAccount: String,
  interest_pmt: {
    type: Number,
    default: 0
  },
  principal_pmt: {
    type: Number,
    default: 0
  },
  date_pmt: Date
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

loanScheduleSchema.post('findOneAndUpdate', function (result) {
  const statusUpdater = require('./helpers/statusUpdater')
  const Loan = require('./Loan')

  Loan.findById({
      _id: result._loan
    })
    .then((obj) => {
      Loan.findByIdAndUpdate(result._loan, statusUpdater(obj), {
        safe: true,
        upsert: true,
        new: true
      }).exec()
    })

})

loanScheduleSchema.post('findByIdAndUpdate', function (result) {
  const statusUpdater = require('./helpers/statusUpdater')
  const Loan = require('./Loan')

  Loan.findById({
      _id: result._loan
    })
    .then((obj) => {
      Loan.findByIdAndUpdate(result._loan, statusUpdater(obj), {
        safe: true,
        upsert: true,
        new: true
      }).exec()
    })
});



const LoanSchedule = mongoose.model('LoanSchedule', loanScheduleSchema);
module.exports = LoanSchedule;