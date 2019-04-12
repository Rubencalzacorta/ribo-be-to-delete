const mongoose   = require('mongoose')


const transactionPlacer = (investors, cashAccount, fee, interest_pmt, principal_pmt, date_pmt, id) => {
    console.log("aqui")
    pendingTransactions = []

    if ((investors.length === 2) &&
        (investors[0]._investor.firstName === "Gabriel" || investors[1]._investor.firstName === "Gabriel") &&
        (investors[0]._investor.firstName === "Patricia" || investors[1]._investor.firstName === "Patricia")) {
        let investorf = investors.filter(e => {
            return e._investor.firstName === "Gabriel"
        })

        investorf.forEach(e => {

            interestTransaction = {
                _loan: mongoose.Types.ObjectId(e._loan),
                _investor: mongoose.Types.ObjectId(e._investor._id),
                _loanSchedule: mongoose.Types.ObjectId(id),
                date: date_pmt,
                cashAccount: cashAccount,
                concept: "INTEREST",
                debit: interest_pmt * 1,
            }

            pendingTransactions.push(interestTransaction)

        })

    } else {

        investors.forEach(e => {

            interestTransaction = {
                _loan: mongoose.Types.ObjectId(e._loan),
                _investor: mongoose.Types.ObjectId(e._investor._id),
                _loanSchedule: mongoose.Types.ObjectId(id),
                date: date_pmt,
                cashAccount: cashAccount,
                concept: "INTEREST",
                debit: interest_pmt * e.pct,
            }

            pendingTransactions.push(interestTransaction)
        })
    }

    investors.forEach(e => {
        principalTransaction = {
            _loan: mongoose.Types.ObjectId(e._loan),
            _investor: mongoose.Types.ObjectId(e._investor._id),
            _loanSchedule: mongoose.Types.ObjectId(id),
            date: date_pmt,
            cashAccount: cashAccount,
            concept: "CAPITAL",
            debit: principal_pmt * e.pct,
        }

        pendingTransactions.push(principalTransaction)
    })

    if ((investors.length === 2) &&
        (investors[0]._investor.firstName === "Gabriel" || investors[1]._investor.firstName === "Gabriel") &&
        (investors[0]._investor.firstName === "Patricia" || investors[1]._investor.firstName === "Patricia")) {
        let investorf = investors.filter(e => {
            return e._investor.firstName === "Gabriel"
        })

        investorf.forEach(e => {
            interestPmt = interest_pmt

            fee.forEach(f => {
                    feeCharge = interestPmt * f.fee
                    creditTransaction = {
                        _loan: mongoose.Types.ObjectId(e._loan),
                        _investor: mongoose.Types.ObjectId(e._investor._id),
                        _loanSchedule: mongoose.Types.ObjectId(id),
                        date: date_pmt,
                        cashAccount: cashAccount,
                        concept: "FEE",
                        credit: feeCharge
                    }
                    pendingTransactions.push(creditTransaction)
                    debitTransaction = {
                        _loan: mongoose.Types.ObjectId(e._loan),
                        _investor: mongoose.Types.ObjectId(f.admin),
                        _loanSchedule: mongoose.Types.ObjectId(id),
                        date: date_pmt,
                        cashAccount: cashAccount,
                        concept: "FEE",
                        debit: feeCharge
                    }
                    pendingTransactions.push(debitTransaction)
                    
            })
        })

    } else {

        investors.forEach(e => {
            interestPmt = interest_pmt * e.pct

            fee.forEach(f => {

                if (e._investor._id != f.admin) {
                feeCharge = interestPmt * f.fee
                creditTransaction = {
                    _loan: mongoose.Types.ObjectId(e._loan),
                    _investor: mongoose.Types.ObjectId(e._investor._id),
                    _loanSchedule: mongoose.Types.ObjectId(id),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    concept: "FEE",
                    credit: feeCharge
                }
                pendingTransactions.push(creditTransaction)
                debitTransaction = {
                    _loan: mongoose.Types.ObjectId(e._loan),
                    _investor: mongoose.Types.ObjectId(f.admin),
                    _loanSchedule: mongoose.Types.ObjectId(id),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    concept: "FEE",
                    debit: feeCharge
                }
                pendingTransactions.push(debitTransaction)
            }
            })
        })
    }

    return pendingTransactions;

}

module.exports = transactionPlacer