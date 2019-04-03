const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const loanScheduleSchema = new Schema({
  _loan: { type: Schema.ObjectId, ref: 'Loan' },
  date: Date,
  interest: Number,
  principal: Number,
  payment: Number,
  balance: Number,
  tracking: String,
  interest_pmt: Number,
  principal_pmt: Number,
  date_pmt: Date,

}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

loanScheduleSchema.post('findOneAndUpdate', function(result) {
  const statusUpdater = require('./helper')
  const Loan = require('./Loan')

  Loan.findById({_id: result._loan})
    .then( (obj) => {

      Loan.findByIdAndUpdate(result._loan, statusUpdater(obj), {safe: true, upsert: true, new: true}).exec()    
    })
})

loanScheduleSchema.post('findByIdAndUpdate', function(result) {
  const statusUpdater = require('./helper')
  const Loan = require('./Loan')
  Loan.findById({_id: result._loan})
    .then( (obj) => {

      Loan.findByIdAndUpdate(result._loan, statusUpdater(obj), {safe: true, upsert: true, new: true}).exec()    
    })
});



const LoanSchedule = mongoose.model('LoanSchedule', loanScheduleSchema);
module.exports = LoanSchedule;