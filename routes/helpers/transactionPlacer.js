const mongoose = require('mongoose')
const Loan = require('../../models/Loan')

const transactionPlacer = (transactionDetails) => {
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
    loan = Loan.findById(_loan).populate('salesPeople')

    let {
        salesPeople
    } = loan



    investors.forEach(e => {


        e._investor.managementFee.forEach(j => {
            if (e._investor.investorType === 'FIXED_INTEREST') {
                let managementTransaction = {
                    _loan: e._loan,
                    _investor: j._managementAccount,
                    _loanSchedule: mongoose.Types.ObjectId(installment),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    currency: currency,
                    concept: "MANAGEMENT_INTEREST",
                    debit: e.pct * interest_pmt * (j.pct),
                }

                pendingTransactions.push(managementTransaction)
            } else {
                let interestTransaction = {
                    _loan: e._loan,
                    _investor: e._investor._id,
                    _loanSchedule: mongoose.Types.ObjectId(installment),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    currency: currency,
                    concept: "INTEREST",
                    debit: e.pct * interest_pmt,
                }

                pendingTransactions.push(interestTransaction)

                let managementTransaction = [{
                    _loan: e._loan,
                    _investor: j._managementAccount,
                    _loanSchedule: mongoose.Types.ObjectId(installment),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    currency: currency,
                    concept: "MANAGEMENT_FEE",
                    debit: e.pct * interest_pmt * (1 - j.pct),
                }, {
                    _loan: e._loan,
                    _investor: e._investor._id,
                    _loanSchedule: mongoose.Types.ObjectId(installment),
                    date: date_pmt,
                    cashAccount: cashAccount,
                    currency: currency,
                    concept: "MANAGEMENT_FEE",
                    credit: e.pct * interest_pmt * (1 - j.pct),
                }]

                managementTransaction.forEach(e => {
                    pendingTransactions.push(e)
                })

            }



            if (salesPeople) {
                salesPeople.forEach(k => {
                    let commissionTransaction = [{
                        _loan: e._loan,
                        _investor: k._salesman,
                        _loanSchedule: mongoose.Types.ObjectId(installment),
                        date: date_pmt,
                        cashAccount: cashAccount,
                        currency: currency,
                        concept: "COMMISSION",
                        debit: interest_pmt * k.pct,
                    }, {
                        _loan: e._loan,
                        _investor: j._managementAccount,
                        _loanSchedule: mongoose.Types.ObjectId(installment),
                        date: date_pmt,
                        cashAccount: cashAccount,
                        currency: currency,
                        concept: "COMMISSION",
                        credit: interest_pmt * k.pct,
                    }]
                    pendingTransactions.push(commissionTransaction)
                    console.log(pendingTransactions, '4')
                })
            }
        })

        let principalTransaction = {
            _loan: e._loan,
            _investor: e._investor._id,
            _loanSchedule: mongoose.Types.ObjectId(installment),
            date: date_pmt,
            cashAccount: cashAccount,
            currency: currency,
            concept: "CAPITAL",
            debit: principal_pmt * e.pct,
        }
        pendingTransactions.push(principalTransaction)


    })

    return pendingTransactions;

}



module.exports = transactionPlacer

// TENDREMOS 2 TIPOS DE INVERSIONISTAS
// FIX_INTEREST
// LOS INVERSIONISTAS CON FIX INTEREST, SOLO INGRESARAN A FINAL DE MES EL MONTO CORRESPONDIENTE A SU 
// VARIABLE_INTEREST

// A PARTIR DE AHORA EL INVERSIONISTA VERA EN SU CUENTA SOLO EL INGRESO POR CONCEPTO DE INTERESES
// NO PODRA VISUALIZAR CUANTO HA PAGADO POR CONCEPTO DE FEES DE GESTION O COMISIONES.
// SIEMPRE SE VISUALIZARA EL NETO
// LA CUENTA DE RIBO INGRESARA DIRECTAMENTE SU  


// if ((investors.length === 2) &&
//     (investors[0]._investor.firstName === "Gabriel" || investors[1]._investor.firstName === "Gabriel") &&
//     (investors[0]._investor.firstName === "Patricia" || investors[1]._investor.firstName === "Patricia")) {
//     let investorf = investors.filter(e => {
//         return e._investor.firstName === "Gabriel"
//     })

//     investorf.forEach(e => {

//         interestTransaction = {
//             _loan: mongoose.Types.ObjectId(e._loan),
//             _investor: mongoose.Types.ObjectId(e._investor._id),
//             _loanSchedule: mongoose.Types.ObjectId(id),
//             date: date_pmt,
//             cashAccount: cashAccount,
//             currency: currency,
//             concept: "INTEREST",
//             debit: interest_pmt * 1,
//         }

//         pendingTransactions.push(interestTransaction)

//     })

// } else {

//     investors.forEach(e => {

//         interestTransaction = {
//             _loan: mongoose.Types.ObjectId(e._loan),
//             _investor: mongoose.Types.ObjectId(e._investor._id),
//             _loanSchedule: mongoose.Types.ObjectId(id),
//             date: date_pmt,
//             cashAccount: cashAccount,
//             currency: currency,
//             concept: "INTEREST",
//             debit: interest_pmt * e.pct,
//         }
//         pendingTransactions.push(interestTransaction)
//     })
// }

// investors.forEach(e => {
//     principalTransaction = {
//         _loan: mongoose.Types.ObjectId(e._loan),
//         _investor: mongoose.Types.ObjectId(e._investor._id),
//         _loanSchedule: mongoose.Types.ObjectId(id),
//         date: date_pmt,
//         cashAccount: cashAccount,
//         currency: currency,
//         concept: "CAPITAL",
//         debit: principal_pmt * e.pct,
//     }

//     pendingTransactions.push(principalTransaction)
// })

// if ((investors.length === 2) &&
//     (investors[0]._investor.firstName === "Gabriel" || investors[1]._investor.firstName === "Gabriel") &&
//     (investors[0]._investor.firstName === "Patricia" || investors[1]._investor.firstName === "Patricia")) {
//     let investorf = investors.filter(e => {
//         return e._investor.firstName === "Gabriel"
//     })

//     investorf.forEach(e => {
//         interestPmt = interest_pmt

//         fee.forEach(f => {
//             feeCharge = interestPmt * f.fee
//             creditTransaction = {
//                 _loan: mongoose.Types.ObjectId(e._loan),
//                 _investor: mongoose.Types.ObjectId(e._investor._id),
//                 _loanSchedule: mongoose.Types.ObjectId(id),
//                 date: date_pmt,
//                 cashAccount: cashAccount,
//                 currency: currency,
//                 concept: "FEE",
//                 credit: feeCharge
//             }
//             pendingTransactions.push(creditTransaction)
//             debitTransaction = {
//                 _loan: mongoose.Types.ObjectId(e._loan),
//                 _investor: mongoose.Types.ObjectId(f.admin),
//                 _loanSchedule: mongoose.Types.ObjectId(id),
//                 date: date_pmt,
//                 cashAccount: cashAccount,
//                 currency: currency,
//                 concept: "FEE",
//                 debit: feeCharge
//             }
//             pendingTransactions.push(debitTransaction)

//         })
//     })

// } else {

//     investors.forEach(e => {
//         interestPmt = interest_pmt * e.pct

//         fee.forEach(f => {

//             if (e._investor._id != f.admin) {
//                 feeCharge = interestPmt * f.fee
//                 creditTransaction = {
//                     _loan: mongoose.Types.ObjectId(e._loan),
//                     _investor: mongoose.Types.ObjectId(e._investor._id),
//                     _loanSchedule: mongoose.Types.ObjectId(id),
//                     date: date_pmt,
//                     cashAccount: cashAccount,
//                     currency: currency,
//                     concept: "FEE",
//                     credit: feeCharge
//                 }
//                 pendingTransactions.push(creditTransaction)
//                 debitTransaction = {
//                     _loan: mongoose.Types.ObjectId(e._loan),
//                     _investor: mongoose.Types.ObjectId(f.admin),
//                     _loanSchedule: mongoose.Types.ObjectId(id),
//                     date: date_pmt,
//                     cashAccount: cashAccount,
//                     currency: currency,
//                     concept: "FEE",
//                     debit: feeCharge
//                 }
//                 pendingTransactions.push(debitTransaction)
//             }
//         })
//     })
// }