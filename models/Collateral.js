const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const constants = require('./constants')
const Loan = require('./Loan')

const collateralSchema = new Schema({
    _loan: {
        type: Schema.ObjectId,
        ref: 'Loan',
    },
    type: {
        type: String,
        enum: constants.collateralTypes,
        required: true
    },
    registerDate: {
        type: Date,
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    currentStatus: [{
        status: {
            type: String,
            enum: constants.currentStatus,
            required: true
        },
        date: {
            type: Date,
            required: true
        }
    }],
    loanPrincipalToValue: {
        type: Number,
        min: 0
    },
    loanOutstandingToValue: {
        type: Number,
        min: 0
    },
    serialNumber: {
        type: String
    },
    model: {
        type: String
    },
    modelNumber: {
        type: String
    },
    color: {
        type: String
    },
    dateOfManufacture: {
        type: Date
    },
    condition: {
        type: String,
        enum: constants.condition
    },
    address: {
        type: String
    },
    description: {
        type: String
    },
    collateralPhoto: {
        type: String
    },
    collateralFiles: {
        type: Array,
        default: []
    },
    registrationNumber: {
        type: String
    },
    kilometrage: {
        type: Number
    },
    engineNumber: {
        type: String
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

collateralSchema.pre('save', async function (next) {
    let loan = await Loan.findById(this.get('_loan')).select('capital')
    let LTV = this.get('value') / loan.capital
    this.loanPrincipalToValue = LTV
    next()
})


const Collateral = mongoose.model('Collateral', collateralSchema);
module.exports = Collateral;