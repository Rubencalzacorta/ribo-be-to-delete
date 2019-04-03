const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const investorSchema = new Schema({
  name: String,
  lastName: String,
  location: {type: String, enum:['PERU', 'VENEZUELA']},
  investments: [{ type: Schema.ObjectId, ref: 'Investment' }],
  investor: {type: Boolean, default: true},
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});



const Investor = mongoose.model('Investor', investorSchema);
module.exports = Investor;