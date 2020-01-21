const mongoose = require('mongoose')
const Loan = require('../../models/Loan')

const transactionPlacer = async (transactionDetails) => {
    pendingTransactions = []
    // console.log(transactionDetails)
    let {
        investors,
        cashAccount,
        interest_pmt,
        principal_pmt,
        date_pmt,
        _loan,
        currency,
        installment
    } = transactionDetails
    // console.log(investors)
    loan = await Loan.findById(_loan).populate('commission')

    let {
        commission
    } = loan
    let commissions = commission

    investors.forEach(investor => {


        investor._investor.managementFee.forEach(management => {
            if (investor._investor.investorType === 'FIXED_INTEREST') {
                let managementTransaction = {
                    _loan: investor._loan,
                    _investor: management._managementAccount,
                    _loanSchedule: mongoose.Types.ObjectId(installment),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    currency: currency,
                    concept: "MANAGEMENT_INTEREST_INCOME",
                    amount: investor.pct * interest_pmt * (management.pct),
                }
                pendingTransactions.push(managementTransaction)

            } else {
                let interestTransaction = {
                    _loan: investor._loan,
                    _investor: investor._investor._id,
                    _loanSchedule: mongoose.Types.ObjectId(installment),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    currency: currency,
                    concept: "INTEREST",
                    amount: investor.pct * interest_pmt,
                }

                pendingTransactions.push(interestTransaction)

                let managementTransaction = [{
                    _loan: investor._loan,
                    _investor: management._managementAccount,
                    _loanSchedule: mongoose.Types.ObjectId(installment),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    currency: currency,
                    concept: "MANAGEMENT_FEE_INCOME",
                    amount: investor.pct * interest_pmt * (management.pct),
                }, {
                    _loan: investor._loan,
                    _investor: investor._investor._id,
                    _loanSchedule: mongoose.Types.ObjectId(installment),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    currency: currency,
                    concept: "MANAGEMENT_FEE_COST",
                    amount: investor.pct * interest_pmt * (management.pct),
                }]

                managementTransaction.forEach(tx => {
                    pendingTransactions.push(tx)
                })

            }

            if (commissions) {
                if (investor._investor.investorType === 'FIXED_INTEREST') {
                    commissions.forEach(commission => {
                        let commissionTransaction = [{
                            _loan: investor._loan,
                            _investor: commission._salesman,
                            _loanSchedule: mongoose.Types.ObjectId(installment),
                            date: date_pmt,
                            cashAccount: cashAccount,
                            currency: currency,
                            concept: "COMMISSION_INCOME",
                            amount: ((investor.pct * interest_pmt * (management.pct)) / interest_pmt) * interest_pmt * commission.pct,
                        }, {
                            _loan: investor._loan,
                            _investor: management._managementAccount,
                            _loanSchedule: mongoose.Types.ObjectId(installment),
                            date: date_pmt,
                            cashAccount: cashAccount,
                            currency: currency,
                            concept: "COMMISSION_COST",
                            amount: ((investor.pct * interest_pmt * (management.pct)) / interest_pmt) * interest_pmt * commission.pct,
                        }]

                        commissionTransaction.forEach(tx => {
                            pendingTransactions.push(tx)
                        })
                    })

                } else {

                    commissions.forEach(commission => {
                        let commissionTransaction = [{
                            _loan: investor._loan,
                            _investor: commission._salesman,
                            _loanSchedule: mongoose.Types.ObjectId(installment),
                            date: date_pmt,
                            cashAccount: cashAccount,
                            currency: currency,
                            concept: "COMMISSION_INCOME",
                            amount: ((investor.pct * interest_pmt) / interest_pmt) * interest_pmt * commission.pct,
                        }, {
                            _loan: investor._loan,
                            _investor: management._managementAccount,
                            _loanSchedule: mongoose.Types.ObjectId(installment),
                            date: date_pmt,
                            cashAccount: cashAccount,
                            currency: currency,
                            concept: "COMMISSION_COST",
                            amount: ((investor.pct * interest_pmt) / interest_pmt) * interest_pmt * commission.pct,
                        }]

                        commissionTransaction.forEach(tx => {
                            pendingTransactions.push(tx)
                        })
                    })
                }
            }

        })

        let principalTransaction = {
            _loan: investor._loan,
            _investor: investor._investor._id,
            _loanSchedule: mongoose.Types.ObjectId(installment),
            date: date_pmt,
            cashAccount: cashAccount,
            currency: currency,
            concept: "CAPITAL",
            amount: principal_pmt * investor.pct,
        }
        pendingTransactions.push(principalTransaction)
    })

    return pendingTransactions;

}



module.exports = transactionPlacer