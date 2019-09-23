const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const {
    loanScheduleUpdater,
    intAndCapCalc
} = require("./helpers/statusUpdater");
const {
    txPlacer,
    txDelete
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
        await loanInstallmentPaymentUpdate(amountPaid, loanSchedule, result._loanSchedule, result._id)
        let investors = await Investment.find({
            _loan: result._loan
        }).populate({
            path: '_investor',
            populate: {
                path: 'managementFee'
            }
        })

        let loan = await Loan.findById(result._loan)
        let IandK = await intAndCapCalc(loanSchedule, result.amount)

        txPlacer(result, investors, loan, IandK)
            .then(resp => console.log(`status: success, txs_inserted: ${resp.length}`))
            .catch(e => console.log(`status: failed, error: ${e}`))


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
        let scheduleUpdate = await loanInstallmentDeleteUpdate(amountPaid, loanSchedule, result._loanSchedule, result._id)
        let IandK = await intAndCapCalc(loanSchedule, result.amount)
        await Loan.findById(result._loan)

        txDelete(result._id).then(response => console.log(`status: success, elements_deleted: ${response.deletedCount}`))

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

const loanInstallmentPaymentUpdate = async (amountPaid, loanSchedule, id, payments) => {
    let update = await loanScheduleUpdater(amountPaid, loanSchedule)

    return await LoanSchedule.findByIdAndUpdate(id, {
            $set: update,
            $push: {
                payments
            }
        }, {
            new: true,
            safe: true,
            upsert: true
        })
        .then(console.log(
            `status: updated loan schedule payments, amount paid ${update.interest_pmt+update.principal_pmt}`
        ))
}


const loanInstallmentDeleteUpdate = async (amountPaid, loanSchedule, id, payments) => {
    let update = await loanScheduleUpdater(amountPaid, loanSchedule)
    return await LoanSchedule.findByIdAndUpdate(id, {
            $set: update,
            $pull: {
                payments
            }
        }, {
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