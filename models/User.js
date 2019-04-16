const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const userSchema = new Schema({
  name: String,
  firstName: String,
  lastName: String,
  fullName: String,
  username: String,
  password: String,
  location: {type: String, enum:['PERU', 'DOMINICAN REPUBLIC', 'VENEZUELA', 'DOMINICAN_REPUBLIC', 'WORLD']},
  investments: [{ type: Schema.ObjectId, ref: 'Investment' }],
  username: String,
  password: String,
  superAdmin: {type: Boolean, default: false},
  admin: {type: Boolean, default: false},
  borrower: {type: Boolean, default: true},
  investor: {type: Boolean, default: false},
  gender: String,
  civilStatus: String,
  nationalId: String,
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
  residenceName: String,
  residenceNumber: String,
  city: String,
  country: {type: String, enum: ['PERU', 'VENEZUELA', 'DOMINICAN_REPUBLIC']},
  cellphoneNumber: String,
  email: String,
  zipCode: String,
  employmentStatus: String,
  businessName: String,
  businessAddress: String,
  businessPosition: String,
  startDate: Date,
  businessPhoneNumber: Number,
  businessEmail: String,
  monthlyIncome: Number,
  otherIncome: Number,
  loans: [{ type: Schema.ObjectId, ref: 'Loan' }]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});



const User = mongoose.model('User', userSchema);
module.exports = User;