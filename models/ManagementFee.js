const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const managementFeeSchema = new Schema({
    _investor: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    _managementAccount: {
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

const ManagementFee = mongoose.model('ManagementFee', managementFeeSchema);
module.exports = ManagementFee;