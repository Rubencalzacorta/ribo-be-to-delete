const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const {
    loanScheduleUpdater,
    intAndCapCalc
} = require("./helpers/statusUpdater");

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
    const LoanSchedule = require("./LoanSchedule");

    Payment.find({
        _loanSchedule: result._loanSchedule
    }).then(async payments => {
        let loanSchedule = await LoanSchedule.findById(result._loanSchedule);
        let amountPaid = payments.reduce((acc, e) => {
            return acc + e.amount;
        }, 0);

        let update = await loanScheduleUpdater(amountPaid, loanSchedule)
        let scheduleUpdate = await LoanSchedule.findByIdAndUpdate(result._loanSchedule, update, {
            new: true,
            safe: true,
            upsert: true
        })
        let IandK = await intAndCapCalc(loanSchedule, result.amount)
        let loan = await Loan.findById(result._loan)
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
        let amountPaid = payments.reduce((acc, e) => {
            return acc + e.amount;
        }, 0);

        let update = await loanScheduleUpdater(amountPaid, loanSchedule)
        let scheduleUpdate = await LoanSchedule.findByIdAndUpdate(result._loanSchedule, update, {
            new: true,
            safe: true,
            upsert: true
        })
        let IandK = await intAndCapCalc(loanSchedule, result.amount)
        let loan = await Loan.findById(result._loan)
        const results = {
            amountPaid: amountPaid,
            loanSchedule: loanSchedule,
            scheduleUpdate,
            loan,
            IandK
        };

    });

})

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;