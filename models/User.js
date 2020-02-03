const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ManagementFee = require('./ManagementFee')

const userSchema = new Schema({
  name: String,
  firstName: String,
  lastName: String,
  fullName: String,
  username: String,
  password: String,
  location: {
    type: String,
    enum: ['PERU', 'VENEZUELA', 'DOMINICAN_REPUBLIC', 'GLOBAL', 'USA']
  },
  investments: [{
    type: Schema.ObjectId,
    ref: 'Investment'
  }],
  username: String,
  password: String,
  superAdmin: {
    type: Boolean,
    default: false
  },
  admin: {
    type: Boolean,
    default: false
  },
  borrower: {
    type: Boolean,
    default: true
  },
  investor: {
    type: Boolean,
    default: false
  },
  isSalesman: {
    type: Boolean,
    default: false
  },
  isAutoInvesting: {
    type: Boolean,
    default: false
  },
  gender: String,
  civilStatus: String,
  nationalId: String,
  nationalIdType: {
    type: String,
    enum: ['PASSPORT', 'DRIVING_LICENCE', 'ID', 'IMMIGRATION_CERTIFICATE']
  },
  nationality: String,
  otherNationalities: String,
  placeOfBirth: String,
  DOB: Date,
  immigrationCertificate: String,
  academicLevel: String,
  Occupation: String,
  spouseFullName: String,
  spouseNationalId: String,
  spouseDOB: Date,
  spousePlaceOfBirth: String,
  street: String,
  address: String,
  residenceName: String,
  residenceNumber: String,
  city: String,
  personalReference: String,
  country: {
    type: String,
    enum: ['PERU', 'VENEZUELA', 'DOMINICAN_REPUBLIC']
  },
  cellphoneNumber: String,
  email: String,
  zipCode: String,
  employmentStatus: String,
  businessName: String,
  businessAddress: String,
  businessPosition: String,
  startDate: Date,
  documentID: String,
  documentIncomeOrPayslip: String,
  businessPhoneNumber: Number,
  businessEmail: String,
  bank: String,
  accountNumber: String,
  monthlyIncome: Number,
  otherIncome: Number,
  loans: [{
    type: Schema.ObjectId,
    ref: 'Loan'
  }],
  status: {
    type: String,
    enum: ["PENDING", "ACTIVE", 'VERIFIED'],
    default: "PENDING"
  },
  investorType: {
    type: String,
    enum: ["FIXED_INTEREST", "VARIABLE_INTEREST"],
    default: "VARIABLE_INTEREST"
  },
  confirmationCode: String,
  managementFee: [{
    type: Schema.ObjectId,
    ref: 'ManagementFee'
  }]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});



const User = mongoose.model('User', userSchema);
module.exports = User;