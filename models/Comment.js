const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    _loanSchedule: {
        type: Schema.ObjectId,
        ref: 'LoanSchedule'
    },
    _loan: {
        type: Schema.ObjectId,
        ref: 'Loan'
    },
    _author: {
        required: true,
        type: Schema.ObjectId,
        ref: 'User'
    },
    estimateDate: {
        type: Date,
    },
    comment: {
        type: String,
        required: true
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;