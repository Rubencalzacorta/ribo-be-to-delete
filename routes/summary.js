const express = require('express');
const router  = express.Router();
const LoanSchedule = require("../models/LoanSchedule")
const { portfolioAggregates } = require('./helpers/portfolioAggregates')
const { conceptAggregates } = require('./helpers/investorAggregates')
const Loan = require("../models/Loan")
const Transaction = require("../models/Transaction")
var ObjectID = require('mongodb').ObjectID
const { LoanTotals , CountryLoanTotals} = require('./helpers/totals')
const moment = require('moment')

router.get('/totals/:country', async (req,res,next) => {
    
    if (req.params.country === "WORLD") {
      let generalTotals = await LoanTotals()
      let peruTotals =  await CountryLoanTotals('PERU')
      let dominicanTotals =  await CountryLoanTotals('DOMINICAN_REPUBLIC')
      let venTotals =  await CountryLoanTotals('VENEZUELA')
      Promise.all([generalTotals, peruTotals, venTotals, dominicanTotals])
        .then( obj => {res.status(200).json(obj)})
        .catch(e => next(e))
    } else if ( req.params.country.toUpperCase() === "PERU" ) {
      let peruTotals =  await CountryLoanTotals('PERU')
      Promise.all([peruTotals])
        .then( obj => {res.status(200).json(obj)})
        .catch(e => next(e))
    }

})

router.get('/list/:id',(req,res,next) => {
    let { id } = req.params
    // console.log(id)
    Transaction.find({'_investor': new ObjectID(id)}, null, {sort: {date: 1}})
        .populate({path: '_loan', populate: {path: '_borrower'}})
        .populate({path: '_investor'})
        .then( obj => {res.status(200).json(obj)})
        .catch(e => next(e))
})

router.get('/',(req,res,next) => {
    Transaction.find()
        .then( objList => res.status(200).json(objList))
        .catch(e => next(e))
})


router.post('/',(req,res,next) => {
    Transaction.create(req.body)
        .then( obj => res.status(200).json(obj))
        .catch(e => next(e))
})

router.get('/portfolioAggregates', (req, res, next) => {
    LoanSchedule.aggregate(portfolioAggregates())
        .then( obj => {
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
            dates: {text: 'Fechas', values: obj.map( e => { return moment(e.date).format('MM-YY') })},
            InterestProjectedIncome: {text: 'Intereses Projectados', color: 'green', values: obj.map( e => { return e.InterestProjectedIncome })},
            InterestActualIncome: {text: 'Intereses Recibidos', color: 'red', values: obj.map( e => { return e.InterestActualIncome })},
            cumulativeActualIncome: {text: 'Ingreso por Intereses Acumulado', color: 'green', values: runningActualInterest},
            cumulativeProjectedIncome: {text: 'Interes Acumulado Projectado', color: 'orange', values: runningProjectedInterest},
            PrincipalActualRepayment: {text: 'Capital Repagado', color: 'orange', values: obj.map( e => { return e.PrincipalActualRepayment })},
            PrincipalProjectedRepayment: {text: 'Repago de Capital Proyectado', color: 'blue', values: obj.map( e => { return e.PrincipalProjectedRepayment })},
            PrincipalProjectedOutstanding: {text: 'Capital Colocado', color: 'black', values: obj.map( e => { return e.PrincipalProjectedOutstanding })},
    }})
        .then( obj => res.status(200).json(obj))
        .catch(e => next(e))
})

router.get('/investorAggregates/:id', async (req, res, next) => {
    let { id } = req.params
    let deposit =  await Transaction.aggregate(conceptAggregates('DEPOSIT', id))
    let fees = await Transaction.aggregate(conceptAggregates('FEE', id))
    let interest = await Transaction.aggregate(conceptAggregates('INTEREST', id))
    let capital = await Transaction.aggregate(conceptAggregates('CAPITAL', id))
    let withdrawals = await Transaction.aggregate(conceptAggregates('WITHDRAWAL', id)) 
    let costs = await Transaction.aggregate(conceptAggregates('COST', id)) 
    let investment = await Transaction.aggregate(conceptAggregates('INVESTMENT', id)) 

    Promise.all([deposit,fees,interest,capital,withdrawals,costs,investment])
        .then( obj => {
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
            deposits: {text: 'DEPOSITOS', values: obj[0].map( e => e.available), dates: obj[0].map( e => moment(e.date).format('MM-YY'))},
            acDeposits: {text: 'DEPOSITOS ACUMULADOS', values: runningDeposit, dates: obj[0].map( e => moment(e.date).format('MM-YY'))},
            fees: {text: 'FEES', values: obj[1].map( e => e.available), dates: obj[1].map( e => moment(e.date).format('MM-YY'))},
            acFees: {text: 'FEES ACUMULADOS', values: runningInterest, dates: obj[1].map( e => moment(e.date).format('MM-YY'))},
            interest: {text: 'INTERESES', values: obj[2].map( e => e.available), dates: obj[2].map( e => moment(e.date).format('MM-YY'))},
            acInterest: {text: 'INTERESES ACUMULADOS', values: runningInterest, dates: obj[2].map( e => moment(e.date).format('MM-YY'))},
            capital: {text: 'CAPITAL', values: obj[3].map( e => e.available), dates: obj[3].map( e => moment(e.date).format('MM-YY'))},
            acCapital: {text: 'CAPITAL REPAGADO ACUMULADO', values: runningCapital, dates: obj[3].map( e => moment(e.date).format('MM-YY'))},
            withdrawals: {text: 'RETIROS', values: obj[4].map( e => e.available), dates: obj[4].map( e => moment(e.date).format('MM-YY'))},
            acWithdrawals: {text: 'RETIROS ACUMULADOS', values: runningWithdrawal, dates: obj[4].map( e => moment(e.date).format('MM-YY'))},
            costs: {text: 'COSTOS', values: obj[5].map( e => e.available), dates: obj[5].map( e => moment(e.date).format('MM-YY'))},
            acCosts: {text: 'COSTO ACUMULADO', values: runningCost, dates: obj[5].map( e => moment(e.date).format('MM-YY'))},
            investment: {text: 'INVERSIONES', values: obj[6].map( e => e.available), dates: obj[6].map( e => moment(e.date).format('MM-YY'))},
            acInvestment: {text: 'INVERSIONES ACUMULADAS', values: runningInvestment, dates: obj[6].map( e => moment(e.date).format('MM-YY'))}
        }})
        .then( obj => res.status(200).json(obj))
        .catch(e => next(e))
})

module.exports = router;
