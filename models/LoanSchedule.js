const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const statusUpdater = require('./helpers/statusUpdater')

const statuses = ['DISBURSTMENT', 'PENDING', 'DUE', 'OVERDUE', 'PAID', 'OUTSTANDING', 'CLOSED']
const currencies = ['DOP', 'USD', 'PEN']

const loanScheduleSchema = new Schema({
  _loan: {
    type: Schema.ObjectId,
    ref: 'Loan'
  },
  date: Date,
  date_pmt: Date,
  interest: Number,
  interest_pmt: {
    type: Number,
    default: 0
  },
  principal: Number,
  principal_pmt: {
    type: Number,
    default: 0
  },
  payment: Number,
  balanceDue: Number,
  balance: Number,
  payments: [{
    type: Schema.ObjectId,
    ref: 'Payment'
  }],
  status: {
    type: String,
    enum: statuses
  },
  currency: {
    type: String,
    default: "USD",
    enum: currencies
  },
  tracking: String,
  cashAccount: String,
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

loanScheduleSchema.post('findOneAndUpdate', function (result) {
  const {
    statusUpdater
  } = require('./helpers/statusUpdater')
  const Loan = require('./Loan')
  Loan.findById({
      _id: result._loan
    })
    .then(async (obj) => {
      let updater = await statusUpdater(obj)
      await Loan.findByIdAndUpdate(result._loan, updater, {
        safe: true,
        upsert: true,
        new: true
      })
    })
})

loanScheduleSchema.post('findByIdAndUpdate', function (result) {
  const {
    statusUpdater
  } = require('./helpers/statusUpdater')
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