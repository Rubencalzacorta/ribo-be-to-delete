const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const borrowerSchema = new Schema({
  firstName: String,
  LastName: String,
  borrower: {type: Boolean, default: true},
  fullName: String,
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
  employmentStatus: String,
  businessName: String,
  businessAddress: String,
  businessPosition: String,
  startDate: Date,
  businessPhoneNumber: Number,
  businessEmail: String,
  monthlyIncome: Number,
  otherIncome: Number,
  loans: [{ type: Schema.ObjectId, ref: 'Loan' }],
  borrowerStatus: {type: Boolean, default: false}
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

const Borrower = mongoose.model('Borrower', borrowerSchema);
module.exports = Borrower;