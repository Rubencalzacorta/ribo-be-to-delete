const express = require('express');
const router = express.Router();
const LoanSchedule = require("../models/LoanSchedule")
const {
    portfolioAggregates
} = require('./helpers/portfolioAggregates')
const {
    loanScheduleTotalsByStatus
} = require('./helpers/loanAggregates')
const {
    conceptAggregates
} = require('./helpers/investorAggregates')
const {
    LoanTotals,
    CountryLoanTotals,
    MonthlyLoanScheduleTotals
} = require('./helpers/totals')
const User = require("../models/User")
const Loan = require("../models/Loan")
const Transaction = require("../models/Transaction")
const Investment = require("../models/Investment")
var ObjectID = require('mongodb').ObjectID
const moment = require('moment')

router.get('/totals/:country', async (req, res, next) => {
    if (req.params.country === "WORLD") {
        let cTotals = []
        let countries = User.schema.path('country').enumValues;
        generalTotals = await cTotals.push(LoanTotals())
        //   countries.forEach( e => cTotals.push(CountryLoanTotals(e)))
        Promise.all(cTotals)
            .then(obj => {
                obj = obj.filter(e => e.length !== 0)
                res.status(200).json(obj)
            })
            .catch(e => console.log(e))
    } else {
        let countryTotals = await CountryLoanTotals(req.params.country)
        Promise.all([countryTotals])
            .then(obj => {
                res.status(200).json(obj)
            })
            .catch(e => next(e))
    }
})

router.get('/list/:id', (req, res, next) => {
    let {
        id
    } = req.params
    Transaction.find({
            '_investor': new ObjectID(id)
        }, null, {
            sort: {
                date: 1
            }
        })
        .populate({
            path: '_loan',
            populate: {
                path: '_borrower'
            }
        })
        .populate({
            path: '_investor'
        })
        .then(obj => {
            res.status(200).json(obj)
        })
        .catch(e => next(e))
})

router.get('/', (req, res, next) => {
    Transaction.find()
        .then(objList => res.status(200).json(objList))
        .catch(e => next(e))
})


router.post('/', (req, res, next) => {
    Transaction.create(req.body)
        .then(obj => res.status(200).json(obj))
        .catch(e => next(e))
})

router.get('/portfolio/total/schedule/all', async (req, res, next) => {

    let paid = await LoanSchedule.aggregate(loanScheduleTotalsByStatus('PAID'))
    let due = await LoanSchedule.aggregate(loanScheduleTotalsByStatus('DUE'))
    let overdue = await LoanSchedule.aggregate(loanScheduleTotalsByStatus('OVERDUE'))
    let pending = await LoanSchedule.aggregate(loanScheduleTotalsByStatus('PENDING'))

    Promise.all([paid, due, overdue, pending])
        .then(obj => res.status(200).json(obj))
        .catch(e => next(e))
})

router.get('/portfolio/total/schedule/:status', (req, res, next) => {
    LoanSchedule.aggregate(loanScheduleTotalsByStatus(req.params.status))
        .then(obj => res.status(200).json(obj))
        .catch(e => next(e))
})

router.get('/portfolio/month/schedule/', (req, res, next) => {

    let currencies = Loan.schema.path('currency').enumValues;
    cTotals = []
    currencies.forEach(e => cTotals.push(MonthlyLoanScheduleTotals(e)))
    Promise.all(cTotals)
        .then(obj => {
            res.status(200).json(obj)
        })
        .catch(e => next(e))
})

router.get('/portfolioAggregates', (req, res, next) => {
    LoanSchedule.aggregate(portfolioAggregates())
        .then(obj => {
            let runningActualInterest = []
            let totalActualInterest = 0
            let runningProjectedInterest = []
            let totalProjectedInterest = 0

            obj.forEach(e => {
                totalActualInterest = totalActualInterest + e.InterestActualIncome
                totalProjectedInterest = totalProjectedInterest + e.InterestProjectedIncome
                runningActualInterest.push(totalActualInterest)
                runningProjectedInterest.push(totalProjectedInterest)
            })

            return {
                dates: {
                    text: 'Fechas',
                    values: obj.map(e => {
                        return moment(e.date).format('MM-YY')
                    })
                },
                InterestProjectedIncome: {
                    text: 'Intereses Projectados',
                    color: '#FF6384',
                    values: obj.map(e => {
                        return e.InterestProjectedIncome
                    })
                },
                InterestActualIncome: {
                    text: 'Intereses Recibidos',
                    color: '#36A2EB',
                    values: obj.map(e => {
                        return e.InterestActualIncome
                    })
                },
                cumulativeActualIncome: {
                    text: 'Ingreso x Intereses Acumulado',
                    color: '#FF6384',
                    values: runningActualInterest
                },
                cumulativeProjectedIncome: {
                    text: 'Interes Acumulado Projectado',
                    color: '#36A2EB',
                    values: runningProjectedInterest
                },
                PrincipalActualRepayment: {
                    text: 'Capital Repagado',
                    color: '#36A2EB',
                    values: obj.map(e => {
                        return e.PrincipalActualRepayment
                    })
                },
                PrincipalProjectedRepayment: {
                    text: 'Repago de Capital Proyectado',
                    color: '#FFCE56',
                    values: obj.map(e => {
                        return e.PrincipalProjectedRepayment
                    })
                },
                PrincipalProjectedOutstanding: {
                    text: 'Capital Colocado',
                    color: 'black',
                    values: obj.map(e => {
                        return e.PrincipalProjectedOutstanding
                    })
                },
            }
        })
        .then(obj => res.status(200).json(obj))
        .catch(e => next(e))
})

router.post('/julieta/update', async (req, res, next) => {
    let jmpId = '5cb6cad93472683c4543c22a'
    let gcpId = '5c8103cdcf81366c6c0f1338'
    let gfpId = '5c8103dfcf81366c6c0f133a'

    let newInvestors = [gcpId, gfpId]
    findInvestments = async (id) => {
        return await Investment.aggregate([{
                '$match': {
                    '_investor': new ObjectID(id)
                }
            }, {
                '$lookup': {
                    'from': 'loans',
                    'localField': '_loan',
                    'foreignField': '_id',
                    'as': 'loan'
                }
            }, {
                '$unwind': {
                    'path': '$loan'
                }
            }, {
                '$match': {
                    'loan.status': 'OPEN'
                }
            }, {
                '$project': {
                    '_id': 1,
                    '_loan': 1,
                    '_investor': 1,
                    'pct': 1,
                    'amount': 1,
                    'status': '$loan.status',
                    'capitalRemaining': '$loan.capitalRemaining',
                    'capital': '$loan.capital',
                    'paidCapital': '$loan.totalPaid'
                }
            },
            //  {
            //     '$limit': 5
            // }
        ])
    }




    findInvestments(jmpId).then(async currentInvestments => {


            let iAdj = await currentInvestments.map(e => {
                return {
                    amount: e.amount * 0.495667864232,
                    pct: e.pct * 0.495667864232
                }
            })

            let aAdj = await currentInvestments.map(e => {
                return {
                    amount: e.amount * (1 - 0.495667864232),
                    pct: e.pct * (1 - 0.495667864232)
                }
            })

            let currentTotalInv = currentInvestments.reduce((acc, e) => {
                return acc + e.amount
            }, 0)


            let newTotalInvJ = iAdj.reduce((acc, e) => {
                return acc + e.amount
            }, 0)

            let newTotalInvA = aAdj.reduce((acc, e) => {
                return acc + e.amount
            }, 0)

            let adj = []
            await currentInvestments.map(e => {
                Investment.findByIdAndUpdate({
                        _id: e._id
                    }, {
                        amount: e.amount * 0.495667864232,
                        pct: e.pct * 0.495667864232
                    }, {
                        new: true
                    })
                    .then(e => adj.push(e))
            })



            let newInvestments = []
            await newInvestors.forEach(async investor => {
                await currentInvestments.forEach(investment => {
                    let {
                        _id,
                        ...d
                    } = investment

                    let b = {
                        ...d,
                        _investor: investor,
                        amount: d.amount * 0.25216606788,
                        pct: d.pct * 0.25216606788
                    }
                    newInvestments.push(b)
                })
            })

            // console.log(newInvestments)

            let newInvTotal = newInvestments.reduce((acc, e) => {
                return acc + e.amount
            }, 0)

            addNewInvestments = (newInvestments) => {
                newInvestments.forEach(async e => {
                    let NI = new Investment(e)
                    NI.save().then(async savedInvestment => {

                        let {
                            _loan,
                            _id,
                            _investor
                        } = savedInvestment

                        await User.findByIdAndUpdate(_investor, {
                            $push: {
                                investments: _id
                            }
                        })
                        await Loan.findByIdAndUpdate(_loan, {
                            $push: {
                                investors: _id
                            }
                        })
                    })

                })
            }


            await addNewInvestments(newInvestments)

            let divestituresTx = await currentInvestments.map(e => {
                return {
                    _loan: e._loan,
                    _investor: e._investor,
                    date: new Date(2019, 09, 11, 00, 00, 00, 00),
                    cashAccount: 'PLPERU',
                    currency: 'USD',
                    concept: 'DIVESTMENT',
                    amount: e.capitalRemaining * e.pct * (1 - 0.495667864232),
                }
            })

            let investmentTx = await newInvestments.map(e => {
                return {
                    _loan: e._loan,
                    _investor: e._investor,
                    date: new Date(2019, 09, 11, 16, 00, 00, 00),
                    cashAccount: 'PLPERU',
                    currency: 'USD',
                    concept: 'INVESTMENT',
                    amount: e.capitalRemaining * e.pct,
                }
            })


            div = await Transaction.insertMany(divestituresTx)
            inv = await Transaction.insertMany(investmentTx)

            let totalDivest = divestituresTx.reduce((acc, e) => {
                return acc + e.debit
            }, 0)

            let totalInvest = investmentTx.reduce((acc, e) => {
                return acc + e.credit
            }, 0)
            // let totalAfter = adj.reduce((acc, e) => {
            //     return acc + e.amount
            // }, 0)

            // let totalNew = newInvestments.reduce((acc, e) => {
            //     return acc + e.capitalRemaining
            // }, 0)

            return {
                currentTotalInv,
                newTotalInvJ,
                newTotalInvA,
                totalChanges: newTotalInvJ + newTotalInvA,
                newInvTotal,
                totalDivest,
                totalInvest
            }
        }).then(
            result => res.status(200).json({
                result
            })
        )
        .catch(e => {
            console.log(e)
            res.status(500).json(e.message)
        })

})


function roundNumber(num, scale) {
    if (!("" + num).includes("e")) {
        return +(Math.round(num + "e+" + scale) + "e-" + scale);
    } else {
        var arr = ("" + num).split("e");
        var sig = ""
        if (+arr[1] + scale > 0) {
            sig = "+";
        }
        return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
    }
}

router.get('/investorAggregates/:id', async (req, res, next) => {
    let {
        id
    } = req.params

    let deposit = await Transaction.aggregate(conceptAggregates('DEPOSIT', id))
    let fees = await Transaction.aggregate(conceptAggregates('FEE', id))
    let interest = await Transaction.aggregate(conceptAggregates('INTEREST', id))
    let capital = await Transaction.aggregate(conceptAggregates('CAPITAL', id))
    let withdrawals = await Transaction.aggregate(conceptAggregates('WITHDRAWAL', id))
    let costs = await Transaction.aggregate(conceptAggregates('COST', id))
    let investment = await Transaction.aggregate(conceptAggregates('INVESTMENT', id))

    Promise.all([deposit, fees, interest, capital, withdrawals, costs, investment])
        .then(obj => {
            let runningInterest = []
            let totalInterest = 0
            let runningCapital = []
            let totalCapital = 0
            let runningFee = []
            let totalFee = 0
            let runningDeposit = []
            let totalDeposit = 0
            let runningInvestment = []
            let totalInvestment = 0
            let runningWithdrawal = []
            let totalWithdrawal = 0
            let runningCost = []
            let totalCost = 0

            obj[0].forEach(e => {
                totalDeposit = totalDeposit + e.available
                runningDeposit.push(totalDeposit)
            })

            obj[1].forEach(e => {
                totalFee = totalFee + e.available
                runningFee.push(totalFee)
            })

            obj[2].forEach(e => {
                totalInterest = totalInterest + e.available
                runningInterest.push(totalInterest)
            })

            obj[3].forEach(e => {
                totalCapital = totalCapital + e.available
                runningCapital.push(totalCapital)
            })

            obj[4].forEach(e => {
                totalWithdrawal = totalWithdrawal + e.available
                runningWithdrawal.push(totalWithdrawal)
            })

            obj[5].forEach(e => {
                totalCost = totalCost + e.available
                runningCost.push(totalCost)
            })

            obj[6].forEach(e => {
                totalInvestment = totalInvestment + e.available
                runningInvestment.push(totalInvestment)
            })


            return {
                deposits: {
                    text: 'DEPOSITOS',
                    values: obj[0].map(e => e.available),
                    dates: obj[0].map(e => moment(e.date).format('MM-YY'))
                },
                acDeposits: {
                    text: 'DEPOSITOS ACUMULADOS',
                    values: runningDeposit,
                    dates: obj[0].map(e => moment(e.date).format('MM-YY'))
                },
                fees: {
                    text: 'FEES',
                    values: obj[1].map(e => e.available),
                    dates: obj[1].map(e => moment(e.date).format('MM-YY'))
                },
                acFees: {
                    text: 'FEES ACUMULADOS',
                    values: runningInterest,
                    dates: obj[1].map(e => moment(e.date).format('MM-YY'))
                },
                interest: {
                    text: 'INTERESES',
                    values: obj[2].map(e => e.available),
                    dates: obj[2].map(e => moment(e.date).format('MM-YY'))
                },
                acInterest: {
                    text: 'INTERESES ACUMULADOS',
                    values: runningInterest,
                    dates: obj[2].map(e => moment(e.date).format('MM-YY'))
                },
                capital: {
                    text: 'CAPITAL',
                    values: obj[3].map(e => e.available),
                    dates: obj[3].map(e => moment(e.date).format('MM-YY'))
                },
                acCapital: {
                    text: 'CAPITAL REPAGADO ACUMULADO',
                    values: runningCapital,
                    dates: obj[3].map(e => moment(e.date).format('MM-YY'))
                },
                withdrawals: {
                    text: 'RETIROS',
                    values: obj[4].map(e => e.available),
                    dates: obj[4].map(e => moment(e.date).format('MM-YY'))
                },
                acWithdrawals: {
                    text: 'RETIROS ACUMULADOS',
                    values: runningWithdrawal,
                    dates: obj[4].map(e => moment(e.date).format('MM-YY'))
                },
                costs: {
                    text: 'COSTOS',
                    values: obj[5].map(e => e.available),
                    dates: obj[5].map(e => moment(e.date).format('MM-YY'))
                },
                acCosts: {
                    text: 'COSTO ACUMULADO',
                    values: runningCost,
                    dates: obj[5].map(e => moment(e.date).format('MM-YY'))
                },
                investment: {
                    text: 'INVERSIONES',
                    values: obj[6].map(e => e.available),
                    dates: obj[6].map(e => moment(e.date).format('MM-YY'))
                },
                acInvestment: {
                    text: 'INVERSIONES ACUMULADAS',
                    values: runningInvestment,
                    dates: obj[6].map(e => moment(e.date).format('MM-YY'))
                }
            }
        })
        .then(obj => res.status(200).json(obj))
        .catch(e => next(e))
})

module.exports = router;