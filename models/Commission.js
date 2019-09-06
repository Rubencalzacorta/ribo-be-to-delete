const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commissionSchema = new Schema({
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

const Commission = mongoose.model('Commission', commissionSchema);
module.exports = Commission;