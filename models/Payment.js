const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const {
    loanScheduleUpdater,
    intAndCapCalc
} = require("./helpers/statusUpdater");
const {
    capitalDistributor,
    managementFeeCharge
} = require("./helpers/paymentProcessor");
const LoanSchedule = require("./LoanSchedule");
const Investment = require("./Investment");

const paymentSchema = new Schema({
    _loan: {
        type: Schema.ObjectId,
        ref: "Loan"
    },
    _loanSchedule: {
        type: Schema.ObjectId,
        ref: "LoanSchedule"
    },
    date_pmt: Date,
    amount: Number,
    cashAccount: {
        type: String,
        enum: ["RBPERU", "GCUS", "GFUS", "GCDR"]
    }
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});



paymentSchema.post("save", function (result) {

    const Loan = require("./Loan");

    Payment.find({
        _loanSchedule: result._loanSchedule
    }).then(async payments => {

        let loanSchedule = await LoanSchedule.findById(result._loanSchedule);
        let amountPaid = await amountPaidReducer(payments)
        let scheduleUpdate = await loanInstallmentUpdate(amountPaid, loanSchedule, result._loanSchedule)
        let investors = await Investment.find({
            _loan: result._loan
        }).populate({
            path: '_investor',
            populate: {
                path: 'managementFee'
            }
        })

        let IandK = await intAndCapCalc(loanSchedule, result.amount)
        let loan = await Loan.findById(result._loan)


        capitalDistributorDetails = {
            _loan: result._loan,
            _loanSchedule: result._loanSchedule,
            investors: investors,
            _payment: result._id,
            date: result.date_pmt,
            cashAccount: result.cashAccount,
            currency: loan.currency,
            amount: IandK.principalPayment
        }

        capitalDistributor(capitalDistributorDetails)
        managementFeeCharge(capitalDistributorDetails, IandK.interestPayment)

        const results = {
            amountPaid: amountPaid,
            loanSchedule: loanSchedule,
            scheduleUpdate,
            loan,
            IandK
        };

    });
});

paymentSchema.post('remove', function (result) {

    const Loan = require("./Loan");
    const LoanSchedule = require("./LoanSchedule");

    Payment.find({
        _loanSchedule: result._loanSchedule
    }).then(async payments => {

        let loanSchedule = await LoanSchedule.findById(result._loanSchedule);
        let amountPaid = await amountPaidReducer(payments)
        let scheduleUpdate = await loanInstallmentUpdate(amountPaid, loanSchedule, result._loanSchedule)
        let IandK = await intAndCapCalc(loanSchedule, result.amount)
        let loan = await Loan.findById(result._loan)

        const results = {
            amountPaid: amountPaid,
            scheduleUpdate,
            IandK
        };

        return results

    });
})

const amountPaidReducer = async (payments) => {
    return await payments.reduce((acc, e) => {
        return acc + e.amount;
    }, 0);
}

const loanInstallmentUpdate = async (amountPaid, loanSchedule, id) => {

    let update = await loanScheduleUpdater(amountPaid, loanSchedule)

    return await LoanSchedule.findByIdAndUpdate(id, update, {
            new: true,
            safe: true,
            upsert: true
        })
        .then(console.log(
            `status: updated loan schedule payments, amount paid ${update.interest_pmt+update.principal_pmt}`
        ))
}

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;