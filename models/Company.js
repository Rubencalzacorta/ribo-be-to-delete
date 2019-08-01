const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companySchema = new Schema({
    businessName: String,
    taxID: String,
    sector: String,
    country: String,
    ownership: {
        type: String,
        default: "PRIVATE",
        enum: ['PUBLIC', 'PRIVATE']
    },
    activeYears: Number,
    employeeAmount: Number,
    website: String,
    contactEmployee: String,
    phoneNumber: String,
    email: String,
    address: String,
    city: String,
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const Company = mongoose.model('Company', companySchema);
module.exports = Company;