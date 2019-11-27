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
    },
    paymentType: {
        type: String,
        enum: ["REGULAR", "FULL"],
        default: "REGULAR"
    }
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});



paymentSchema.post("save", async function (result, next) {

    const Loan = require("./Loan");

    let {
        _loan,
        _loanSchedule,
        _id,
        paymentType,
        amount
    } = result

    let payments = await Payment.find({
        _loanSchedule: _loanSchedule
    })
    if (paymentType === "REGULAR") {

        let loanSchedule = await LoanSchedule.findById(_loanSchedule);
        let amountPaid = await amountPaidReducer(payments)
        await loanInstallmentPaymentUpdate(amountPaid, loanSchedule, _loanSchedule, _id, paymentType)
        let investors = await Investment.find({
            _loan: _loan
        }).populate({
            path: '_investor',
            populate: {
                path: 'managementFee'
            }
        })

        let loan = await Loan.findById(_loan).populate({
            path: 'commission'
        })
        let IandK = await intAndCapCalc(loanSchedule, amount, paymentType)

        await txPlacer(result, investors, loan, IandK, next)
            .then(resp => {
                console.log('respues', resp)
                // console.log(`status: success, txs_inserted: ${resp.length}`)
            })
            .catch(e => {
                console.log(e)
                next(`status: failed, error: ${e}`)
            })

        next()
    } else if (paymentType === "FULL") {

        fullPaymentValidator(result, next)
            .then(async (ld) => {

                let {
                    capitalRemaining
                } = ld

                let loanSchedule = await LoanSchedule.findById(_loanSchedule);
                let amountPaid = await amountPaidReducer(payments);
                await loanInstallmentPaymentUpdate(amountPaid, loanSchedule, _loanSchedule, _id, paymentType, capitalRemaining)
                let investors = await Investment.find({
                    _loan: _loan
                }).populate({
                    path: '_investor',
                    populate: {
                        path: 'managementFee'
                    }
                })

                let loan = await Loan.findById(_loan).populate({
                    path: 'commission'
                })

                let IandK = await intAndCapCalc(loanSchedule, amount, paymentType, capitalRemaining)

                await txPlacer(result, investors, loan, IandK)
                    .then(resp => {
                        console.log(`status: success, txs_inserted: ${resp.length}`)
                    })
                    .catch(e => next(`status: failed, error: ${e}`))

                next()

            }).catch(e => {
                next(e)
            })
    }
});

const loanInstallmentPaymentUpdate = async (amountPaid, loanSchedule, id, payments, paymentType, capitalRemaining) => {
    let update = await loanScheduleUpdater(amountPaid, loanSchedule, paymentType, capitalRemaining)
    console.log(update)
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



const fullPaymentValidator = async (result, next) => {
    const Loan = require("./Loan");

    return Loan.findOne({
        _id: result._loan
    }).then(loan => {
        if (loan.capitalRemaining > result.amount) {
            Payment.findOneAndDelete({
                _id: result._id
            }).then(() => console.log(`status: failed, payment: insufficient`))
            throw new Error('payment was insufficient')
        }

        return {
            capitalRemaining: loan.capitalRemaining,
            amount: result.amount
        }

    }).catch(e => next(e))
}

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



const loanInstallmentDeleteUpdate = async (amountPaid, loanSchedule, id, payments) => {
    let update = await loanScheduleUpdater(amountPaid, loanSchedule)
    console.log(update)
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