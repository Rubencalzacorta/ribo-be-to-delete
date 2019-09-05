const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const salesPeopleSchema = new Schema({
    _loan: {
        type: Schema.ObjectId,
        ref: 'Loan'
    },
    _salesman: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    pct: Number,
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const SalesPeople = mongoose.model('SalesPeopleSchema', salesPeopleSchema);
module.exports = SalesPeople;