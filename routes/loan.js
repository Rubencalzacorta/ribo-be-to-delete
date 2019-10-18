const express = require('express');
const router  = express.Router();
const Finance = require('financejs')
const mongoose   = require('mongoose')
const _ = require('lodash');
const moment = require('moment')
const path = require('path');
const LoanSchedule = require("../models/LoanSchedule")
const Transaction = require("../models/Transaction")
const Commission = require("../models/Commission")
const Investment = require("../models/Investment")
const Payment = require("../models/Payment")
const Loan = require("../models/Loan")
const User = require("../models/User")
const transactionPlacer = require('./helpers/transactionPlacer')
const { 
    scheduleRecorder,
    borrowerLoanRecorder,
    investmentsRecorder,
    transactionLoanRecorder
 } = require ('./helpers/loanAggregates')
const { loanSelector } = require('./helpers/loanSchedule')
const {investmentDistributor,
       cashAvailabilityValidator} =require('./helpers/investorAggregates')
const {
    countryOutstandingQuery,
    countryPaidQuery,
    countryAllLoansQuery,
    countryDueQuery,
    countryOverdueQuery,
    allLoansQuery,
    paidQuery,
    dueQuery,
    overdueQuery,
    outstandingQuery
} = require('./helpers/aggregates')


const loanCrud = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }

    router.post('/create/all-active-invest', async (req, res, next) => {
        let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
        let paths = Object.keys(Loan.schema.paths).filter(e => !notUsedPaths.includes(e));
        const loanInitDetails = _.pickBy(req.body, (e, k) => paths.includes(k));
        let {
            _borrower,
            loanDetails,
            country
        } = req.body


        let {
            currency,
        } = loanInitDetails

        if (country === 'VENEZUELA') {
            country = 'USA'
        }

        
        await cashAvailabilityValidator(country, loanDetails.investedCapital)
            .then(obj => {
                try {
                    if (obj.status === false) {
                        throw new Error(`Balance insuficiente, disponibilidad: ${(obj.cash).toFixed(2)}`)
                    } else if (obj.status) {
                        Loan.create({...loanInitDetails,...loanDetails})
                            .then(async obj => {
                                let loanId = obj._id
                                let investments = await investmentDistributor(country, loanDetails.investedCapital, loanId, currency)
                                let schedule = await loanSelector(loanId, loanDetails, currency)
                                await scheduleRecorder(schedule, loanId, next)
                                await borrowerLoanRecorder(_borrower, loanId, next)
                                await investmentsRecorder(investments, loanId, next)
                                await transactionLoanRecorder(investments, loanDetails, currency, next)
                                return obj
                            })
                            .then(obj => {
                                res.status(200).json({
                                    status: 'success',
                                    message: obj
                                })
                            })
                            .catch(e => {
                                next(e)
                            })
                    }
                } catch (e) {
                    next(e)
                }
            })

        
    })

    router.post('/create',(req,res,next) => {
        let notUsedPaths = ['_id','updated_at','created_at','__v'];
        let paths = Object.keys(Loan.schema.paths).filter(e => !notUsedPaths.includes(e));
        const loanInitDetails = _.pickBy(req.body, (e,k) => paths.includes(k));
        let { _borrower, loanDetails, toInvest} = req.body 
        let {currency} = loanInitDetails
        Loan.create({...loanInitDetails, ...loanDetails})
            .then( obj => {
                let loanId = obj._id
                let schedule = loanSelector(loanId, loanDetails, currency)
                schedule.forEach( e => {
                    LoanSchedule.create(e)
                    .then( (schedule_t) => {
                        Loan.findByIdAndUpdate(loanId,
                            {$push: {loanSchedule: schedule_t._id}},
                            {safe: true, upsert: true}).exec()
                    })
                    .catch( e => next(e))
                })
                return obj;
            })
            .then( obj => {
                let loanId = obj._id
                let investments = toInvest.map( e => ({_loan: loanId, ...e, currency}))
                investments.forEach( e => { 
                    Investment.create(e)
                    .then( (investment_x) => {
                        User.findByIdAndUpdate(e._investor,
                            {$push: {investments: investment_x._id}},
                            {safe: true, upsert: true}).exec()
                        return investment_x
                    })
                    .then( (investment_x) => {
                        Loan.findByIdAndUpdate(loanId,
                            {$push: {investors: investment_x._id}},
                            {safe: true, upsert: true}).exec()
                    })
                })
                return obj
            })
            .then( obj => {
                let loanId = obj._id
                User.findByIdAndUpdate(_borrower,
                    {$push: {loans: loanId}},
                    {safe: true, upsert: true}).exec()
                return obj
            })
            .then( obj => {
                let loanId = obj._id
                let investments = toInvest.map( e => ({_loan: loanId, ...e, currency}))
                pendingTransactions = []
                investments.forEach( e => { 
                    let credit = e.amount
                    let transaction = {
                        _loan: e._loan,
                        _investor: mongoose.Types.ObjectId(e._investor),
                        date: loanDetails.startDate,
                        cashAccount: e.cashAccount,
                        concept: 'INVESTMENT',
                        credit: credit,
                        currency: currency
                    }
                    pendingTransactions.push(transaction)
                })
                Transaction.insertMany(pendingTransactions)
                return obj
            })
            .then( obj => {
                res.status(200).json(obj)
            })
            .catch(e => {
                res.status(500).json(e) 
            })
    })


    router.patch('/installmentpmt/:id',(req,res,next) => {
            
        let notUsedPaths = ['_id','updated_at','created_at','__v'];
        let paths = Object.keys(LoanSchedule.schema.paths).filter(e => !notUsedPaths.includes(e));
        console.log(req.body)
        console.log(req.params)
        const {id} = req.params;
        const { cashAccount, interest_pmt, principal_pmt, date_pmt, currency } = req.body.payment
        const object = _.pickBy(req.body.payment, (e,k) => paths.includes(k));
        const updates = _.pickBy(object, _.identity);



        LoanSchedule.findByIdAndUpdate(id, updates, {new:true})
            .then( obj => {
                return Investment.find({_loan: obj._loan}).populate({path: '_investor', populate: {path: 'managementFee'}}).exec()
            })
            .then( async investments => {
                let transactionDetails = {
                            investors: investments,
                            cashAccount: cashAccount,
                            interest_pmt: interest_pmt,
                            principal_pmt: principal_pmt,
                            date_pmt: date_pmt,
                            _loan: investments[0]._loan,
                            currency: currency,
                            installment: id,
                }
    
                let pendingTransactions = await transactionPlacer(transactionDetails)
                
                Transaction.insertMany(pendingTransactions)
                return pendingTransactions
            })
            .then( () => {

            res.status(200).json({
                status: 'success', 
                message: 'Loan Payment and Distribution Recorded Successfully'
                })
            })

            .catch(e => {
                console.log(e)
                next(e)})
    })

    router.post('/commission', async (req, res, next) => {

        let {
            _loan,
            _salesmen,
            pct
        } = req.body

        let CF = await Commission.findOne({
            _loan: _loan,
            _salesmen: _salesmen
        })

        try {
            if (CF) {
                throw new Error('Relationship already exist')
            } else {
                Commission.create({
                    _loan: mongoose.Types.ObjectId(_loan),
                    _salesman: mongoose.Types.ObjectId(_salesmen),
                    pct: pct
                }).then(async commissionStructure => {
                    let L = await Loan.findById(_loan)
                    await L.commission.push(commissionStructure._id)
                    return L.save()
                }).then(loan => {
                    res.status(200).json({
                        status: "success",
                        data: loan.commission
                    })
                }).catch(e => next(e))
            }
        } catch (e) {
            next(e)
        }
    })

    router.get('/commission/salesmen', (req, res, next) => {
        try {
            User.find({isSalesman: true})
                .then(resp => {
                    res.status(200).json({
                        status: "success",
                        data: resp
                    })
                }).catch(e => console.log(e))
        } catch (e) {
            next(e)
        }
    })

    router.get('/commission/:loanId', async (req, res, next) => {
        let {
            loanId,
        } = req.params
        try {

            loan = await Loan.findById(loanId).populate({
                path: 'commission',
                populate: {
                    path: '_salesman'
                }
            })
            res.status(200).json({
                status: "success",
                data: loan.commission
            })

        } catch (e) {
            next(e)
        }
    })

    router.delete('/commission/:commissionId', async (req, res, next) => {
        let {
            commissionId,
        } = req.params
        
        let C = await Commission.findById(commissionId)

        try {
            if (!C) {
                throw new Error('Commission does not exist')
            } else {
                Commission.findByIdAndDelete(commissionId)
                    .then(async deletedItem => {
                        let L = await Loan.findById(deletedItem._loan)
                        L.commission.pull(deletedItem._id)
                        L.save()
                    })
                    .then(resp => {
                        res.status(200).json({
                            status: "success",
                            data: resp
                        })
                    })
            }
        } catch (e) {
            next(e)
        }
    })



    router.delete('/deletepmt/:id',(req,res,next) => {
            
        const {id} = req.params;

        LoanSchedule.findById(id).select({"date": 1})
        .then( resp => 
            {
            if (moment(resp.date) > moment()) {
                return {
                    interest_pmt: 0,
                    principal_pmt: 0,
                    status: 'PENDING',
                    cashAccount: null
                }
            } else if (moment(resp.date) <= moment() && moment(resp.date) > moment().subtract(7, 'd')) {
                return {
                    interest_pmt: 0,
                    principal_pmt: 0,
                    status: 'DUE',
                    cashAccount: null
                }
            } else {
                return {
                    interest_pmt: 0,
                    principal_pmt: 0,
                    status: 'OVERDUE',
                    cashAccount: null
                }
            }})
        .then( (updates) => { LoanSchedule.findByIdAndUpdate(id, updates, {new:true}).exec()})
        .then( async () => { await Transaction.deleteMany({_loanSchedule: mongoose.Types.ObjectId(id)})})
        .then( async () => { await Payment.deleteMany({_loanSchedule: mongoose.Types.ObjectId(id)})})
        .then( () => res.status(200).json({status: "Success", message: "Removed Successfully"}))
        .catch(e => next(e))
    })

    router.get('/',(req,res,next) => {
        Loan.find()
            .then( objList => res.status(200).json(objList))
            .catch(e => next(e))
    })

    router.get('/status/:status',(req,res,next) => {
        Loan.find({status: req.params.status.toUpperCase()})
            .then( objList => res.status(200).json(objList))
            .catch(e => next(e))
    })

    router.delete('/:id', (req,res,next) => {
        Loan.findOne({_id: req.params.id})
            .then( obj => obj.remove() )
            .then( res.status(200).json({status: "success", comment:"Removed from db"}))
            .catch( e => next(e) )
    })

    router.get('/loanschedule/:id',(req,res,next) => {
        let { id } = req.params
        LoanSchedule.find({_loan: id}, null, {sort: {date: 1}})
            .then( objList => res.status(200).json(objList))
            .catch(e => next(e))
    })

    router.get('/complete-details/:id', async (req,res,next) => {
        let { id } = req.params

        let Investors = await Investment.find({_loan: id}).populate('_investor', 'firstName lastName fullName amount pct ')
        let LoanDetails = await Loan.findById(id)
        let Transactions = await Transaction.find({
            _loan: id
        }).populate('_investor', 'firstName lastName')

        Promise.all([Investors,LoanDetails,Transactions])
            .then( objList => {
                 res.status(200).json
                ({
                    investors: objList[0],
                    details: objList[1],
                    transactions: objList[2]
                })})
            .catch(e => next(e))
    })

    router.get('/current-week', (req,res,next) => {
        
        const today = moment();
        const fromDate = today.startOf('week').toISOString();
        const toDate = today.endOf('week').toISOString();

        LoanSchedule.find({
            date: {
                $gte: fromDate,
                $lt: toDate,
            }}, null ,{ sort: {date: 1}}
        )
        .populate({path: '_loan', populate: {path: '_borrower'}})
        .then( objList => res.status(200).json(objList))
    })


router.get('/schedule/:startDate/:endDate/:country', (req,res,next) => {

    const { startDate, endDate, country} = req.params
    const fromDate = moment(startDate).toISOString();
    const toDate = moment(endDate).toISOString();


    if (country !== 'WORLD') {
        LoanSchedule.aggregate([
            {
              '$lookup': {
                'from': 'loans', 
                'localField': '_loan', 
                'foreignField': '_id', 
                'as': 'details'
              }
            }, {
              '$lookup': {
                'from': 'users', 
                'localField': 'details._borrower', 
                'foreignField': '_id', 
                'as': 'borrower'
              }
            }, {
              '$match': {
                'details.status': 'OPEN', 
                'date': {
                  '$gte': new Date(fromDate), 
                  '$lt': new Date(toDate)
                }, 
                'borrower.country': country
              }
            }
          ])
          .then( objList => res.status(200).json(objList))
          .catch( error => next(error))
    } else {
        LoanSchedule.aggregate([
            {
              '$lookup': {
                'from': 'loans', 
                'localField': '_loan', 
                'foreignField': '_id', 
                'as': 'details'
              }
            }, {
              '$lookup': {
                'from': 'users', 
                'localField': 'details._borrower', 
                'foreignField': '_id', 
                'as': 'borrower'
              }
            }, {
              '$match': {
                'details.status': 'OPEN', 
                'date': {
                    '$gte': new Date(fromDate), 
                    '$lt': new Date(toDate)
                }
              }
            }
            
          ])
          .then( objList => res.status(200).json(objList))
          .catch( error => next(error))
    }
})

router.get('/portfolio-status/:country/:fromDate/:toDate', async (req, res, next) => {
    
    let { country, fromDate, toDate} = req.params
    let allLoansSearch, paidQuerySearch, dueQuerySearch, overdueQuerySearch, outstandingQuerySearch
    let startOfMonth = moment().startOf('month')
    let endOfMonth = moment().endOf('month')
    
    if (country === 'WORLD') {
        allLoansSearch = await LoanSchedule.aggregate(allLoansQuery(fromDate, toDate))
        paidQuerySearch = await LoanSchedule.aggregate(paidQuery(startOfMonth, endOfMonth))
        outstandingQuerySearch = await LoanSchedule.aggregate(outstandingQuery(startOfMonth, endOfMonth))
        dueQuerySearch = await LoanSchedule.aggregate(dueQuery(fromDate, toDate))
        overdueQuerySearch = await LoanSchedule.aggregate(overdueQuery())
    } else {
        allLoansSearch = await LoanSchedule.aggregate(countryAllLoansQuery(country, fromDate, toDate))
        paidQuerySearch = await LoanSchedule.aggregate(countryPaidQuery(country, startOfMonth, endOfMonth))
        outstandingQuerySearch = await LoanSchedule.aggregate(countryOutstandingQuery(country, startOfMonth, endOfMonth))
        dueQuerySearch = await LoanSchedule.aggregate(countryDueQuery(country,fromDate, toDate))
        overdueQuerySearch = await LoanSchedule.aggregate(countryOverdueQuery(country))
    }
    
    Promise.all([allLoansSearch, paidQuerySearch, dueQuerySearch, overdueQuerySearch, outstandingQuerySearch])
        .then( objList => {

            let unique1 = objList[0].map( e => {return (e._id).toString()})
            let unique2 = objList[2].map( e => {return (e._id).toString()})

            unique12 = unique1.filter((o) => unique2.indexOf(o) === -1);
            unique22 = unique2.filter((o) => unique1.indexOf(o) === -1);

            const unique = unique12.concat(unique22);


            let periodDetails = {
                portfolio: {  
                    interest: objList[0].reduce( (acc, e) =>  {return acc + e.interest},0),
                    principal: objList[0].reduce( (acc, e) =>  {return acc + e.principal},0),
                    interest_pmt: objList[0].reduce( (acc, e) =>  {return acc + e.interest_pmt},0),
                    principal_pmt: objList[0].reduce( (acc, e) =>  {return acc + (e.principal_pmt ? e.principal_pmt : 0 )},0),
                    numberOfInstallments: objList[0].length,
                    installments: objList[0]
                  
                },
                paid: {
                    interest: objList[1].reduce( (acc, e) =>  {return acc + e.interest},0),
                    principal: objList[1].reduce( (acc, e) =>  {return acc + e.principal},0),
                    interest_pmt: objList[1].reduce( (acc, e) =>  {return acc + e.interest_pmt},0),
                    principal_pmt: objList[1].reduce( (acc, e) =>  {return acc + (e.principal_pmt ? e.principal_pmt : 0 )},0),
                    numberOfInstallments: objList[1].length,
                    installments: objList[1]
                }, 
                due: {
                    interest: objList[2].reduce( (acc, e) =>  {return acc + e.interest},0),
                    principal: objList[2].reduce( (acc, e) =>  {return acc + e.principal},0),
                    interest_pmt: objList[2].reduce( (acc, e) =>  {return acc + e.interest_pmt},0),
                    principal_pmt: objList[2].reduce( (acc, e) =>  {return acc + (e.principal_pmt ? e.principal_pmt : 0 )},0),
                    numberOfInstallments: objList[2].length,
                    installments: objList[2]
                }, 
                overdue: {
                    interest: objList[3].reduce( (acc, e) =>  {return acc + e.interest},0),
                    principal: objList[3].reduce( (acc, e) =>  {return acc + e.principal},0),
                    interest_pmt: objList[3].reduce( (acc, e) =>  {return acc + e.interest_pmt},0),
                    principal_pmt: objList[3].reduce( (acc, e) =>  {return acc + (e.principal_pmt ? e.principal_pmt : 0 )},0),
                    numberOfInstallments: objList[3].length,
                    installments: objList[3]
                },
                outstanding: {
                    interest: objList[4].reduce((acc, e) => {
                        return acc + (e.interest-e.interest_pmt)
                    }, 0),
                    principal: objList[4].reduce((acc, e) => {
                        return acc + (e.principal - e.principal_pmt)
                    }, 0),
                    interest_pmt: objList[4].reduce((acc, e) => {
                        return acc + e.interest_pmt
                    }, 0),
                    principal_pmt: objList[4].reduce((acc, e) => {
                        return acc + (e.principal_pmt ? e.principal_pmt : 0)
                    }, 0),
                    numberOfInstallments: objList[4].length,
                    installments: objList[4]
                }
            }
            return periodDetails

        }).then( periodDetails => res.status(200).json(periodDetails))
})

router.patch('/update-due', (req, res, next) => {
    
    let begMonth = moment()
    let endMonth = moment().add(30, 'd')
    let queryPending = {date: {$lte: endMonth, $gte: begMonth}, status: 'PENDING'}
    let updateToDue = { $set: {status: 'DUE'} }
    let queryClosedLoans = {status: 'CLOSED'}
    let updateToClosed = { $set: {status: 'CLOSED'} }

    LoanSchedule.updateMany(queryPending, updateToDue)
    .then( (e) => {
        console.log('OVERDUE CRON SCHEDULED SUCCESSFULLY', e)
        let overdueDate = moment().subtract(7, 'd');
        let queryDue =  {date: {$lte: overdueDate}, status: 'DUE'}
        let updateToOverdue = { $set: {status: 'OVERDUE'} }
        LoanSchedule.updateMany(queryDue, updateToOverdue)}).then( resp => console.log({updated: resp}))    
    .catch( e => console.log(e))

    Loan.find(queryClosedLoans).select({ "status": 1, "_id": 1, '_borrower': 0, 'loanSchedule': 0, 'investors': 0})
        .then( resp => { return resp = resp.map( e => {return e._id})})
        .then( resp => LoanSchedule.updateMany({_loan: {$in: resp}}, updateToClosed))
        .then( objList => console.log({Updated: objList}))
        .catch( e => console.log(e))
})

router.patch('/update-status-database', async (req, res, next) => {
    update1 = { $set: {status: 'OPEN'} }
    query = {status: 'open'}
    await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated1: resp})) 
})

router.patch('/update-investor-auto', async (req, res, next) => {
    update1 = {
        $set: {
            isAutoInvesting: true
        }
    }

    query = {
        investor: true
    }
    await User.updateMany(query, update1).then(resp => console.log({
        updated1: resp
    }))
})


router.patch('/status-fix', async (req, res, next) => {
    
    Loan.find({
        // _id: '5cbfa4a310da3800174e33a7'
    })
    .then( Loans => {
        let arr = []
        Loans.forEach( async loan => { 
            let update = await loanUpdater(loan)
            arr.push(update)
        })
        return arr
    })
    .then( obj => { res.status(200).json({status: 'done', obj})})
    .catch( e => res.status(500).json(e))
})

const loanUpdater = async (loan) => {
    let {
        loanSchedule,
        capital,
    } = loan

    let totalPaidLs = await loanSchedule.reduce((acc, j) => {
        return parseFloat(j.principal_pmt) + acc
    }, 0)


    if (totalPaidLs > (capital - 1)) {

        return await Loan.findByIdAndUpdate(loan._id, {
            status: 'CLOSED',
            totalPaid: totalPaidLs,
            capitalRemaining: 0
        }, {
            safe: true,
            upsert: true,
            new: true
        }).then( async () => {
            await loanSchedule.forEach(async schedule => {
                let newStatus = await loanScheduleUpdater(schedule, 'CLOSED')
                await LoanSchedule.findByIdAndUpdate(schedule._id, {
                    status: newStatus.status
                }, {
                    safe: true,
                    upsert: true,
                    new: true
                })
                // .then(() => console.log(`UPDATING STATUS TO ${newStatus.status}`))
            })
        }).then(() => {
            return {
            id: loan._id,
            status: 'updated to closed status'
        }
        })
        // .then(console.log('CLOSING'))

    } else {

        return await Loan.findByIdAndUpdate(loan._id, {
            totalPaid: totalPaidLs,
            capitalRemaining: (capital - totalPaidLs),
            status: 'OPEN'
        }, {
            safe: true,
            upsert: true,
            new: true
        }).then( async () => {
            await await loanSchedule.forEach(async schedule => {
                let newStatus = await loanScheduleUpdater(schedule, 'OPEN')
                await LoanSchedule.findByIdAndUpdate(schedule._id, {
                    status: newStatus.status
                }, {
                    safe: true,
                    upsert: true,
                    new: true
                })
                // .then(() =>  console.log(`UPDATING STATUS TO ${newStatus.status}`))
            })
        }).then( () => {
            return {
                id: loan._id,
                status: 'updated to open status'
            }
        })
        // .then(() => console.log('OPENING'))

    }
}


router.patch('/schedule/fix', (req, res, next) => {
    Loan.find({})
    .then( LS => {
        arr = []
        LS.forEach( l => {
            if (l.status === 'OPEN'){
                l.loanSchedule.forEach( async S => {
                        let newStatus = await loanScheduleUpdater(S)
                        console.log(newStatus)
                        await LoanSchedule.findByIdAndUpdate(S._id, {status: newStatus.status})
                        
                    })
            } 

            // if (l.status === 'CLOSED'){
            //     l.loanSchedule.forEach(async S => {
            //         await LoanSchedule.findByIdAndUpdate(S._id, {
            //             status: 'CLOSED'
            //         }).then(() => {
            //             console.log('UPDATING SCHEDULE STATUS')
            //         })
            //     })
            // }
        })
        return arr
    })
    .then(obj => {
        res.status(200).json({
            status: 'done',
            obj
        })
    })
    .catch(e => res.status(500).json(e))
})


const loanScheduleUpdater = (loanSchedule, loanStatus) => {

  let {
    principal,
    interest,
    status,
    date,
    payment,
    balanceDue
  } = loanSchedule

  if (payment === 0 ) {
    status = 'DISBURSTMENT'
  } else if (loanStatus === 'CLOSED') {
    status = 'PAID'
  } else if (balanceDue < 1 && loanStatus !== 'CLOSED')  {
    status = "PAID"
  }  else if (balanceDue === payment && loanStatus !== 'CLOSED') {
    status = statusSetter(date)
  } else if (balanceDue >= 1 && loanStatus !== 'CLOSED') {
      status = "OUTSTANDING"
  }

  return {
    status
  }

}

const dateDiff = (date1, date2) => {
    const diffTime = date2 - date1;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const statusSetter = (date) => {
    todayDate = new Date()
    

    if (dateDiff(todayDate, date) >= 14) {
        return 'PENDING'
    } else if (dateDiff(todayDate, date) < 7 && dateDiff(todayDate, date) > -7) {
        return 'DUE'
    } else if (dateDiff(todayDate, date) < -7) {
        return 'OVERDUE'
    }
}


router.patch('/payment-fix', async (req, res, next) => {
    arr = []
    items = await LoanSchedule.find({}).select({
        "_id": 1,
        "interest": 1,
        "principal": 1,
        "interest_pmt": 1,
        "principal_pmt": 1
    })


    await items.forEach( async e => {
        let update = parseFloat(e.interest) + parseFloat(e.principal)

        let balanceDue = parseFloat(e.interest) +
            parseFloat(e.principal) -
            parseFloat(e.interest_pmt) -
            parseFloat(e.principal_pmt)
        if (balanceDue < 1 ) {
            balanceDue = 0
            status = 'PAID'
            let op = await LoanSchedule.findByIdAndUpdate(e._id, {
            payment: update,
            balanceDue: balanceDue,
            status
            }, {
            new: true
            })
            arr.push(op)
        } else {
            let op = await LoanSchedule.findByIdAndUpdate(e._id, {
                payment: update,
                balanceDue: balanceDue
            }, {
                new: true
            })
        arr.push(op)
        }

    

        
    })

    Promise.all(arr)
        .then( obj => {
        res.status(200).json({
            docs: obj.length,
            doc1000: obj[1000],
            done: 'done'
            })}
        )
        .catch(e => console.log(e))
 
})


router.get('/all-loans/list', async (req, res, next) => {
    let finance = new Finance()

    items = await Loan.find({
            // loanType: {
            //     $in: ['linear',
            //         'linearIntFirst',
            //         'amort'
            //     ]
            // }
        }).select({
        "_id": 1,
        "loanSchedule": 1,
        "duration": 1,
        "_borrower": 0,
        "investors": 0
    })
    
    Promise.all([items])
        .then( async items => {
            let loans = await items[0].map( e => {
                return {
                    _id: e._id,
                    duration: e.duration,
                    loanSchedule: e.loanSchedule.sort(compare = (a, b) => {
                                return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
                })
            }})
            pIRR = []
            loans.forEach( (e) => {
                let cf = []
                e.loanSchedule.forEach((j, i) => {
                    if (i === 0) {
                        cf.push(j.balance*-1)
                    } else (
                        cf.push(j.principal+j.interest)
                    )
                })

                console.log(e)
                let IRR = finance.IRR(...cf)
                let PP = finance.PP(e.duration, ...cf)
                Loan.findByIdAndUpdate(e._id, {IRR: IRR, PaybackPeriod: PP})
                    .then(() => console.log('done'))

                pIRR.push({
                    IRR: IRR,
                    PP: PP,
                    DUR: e.duration,
                    _id: e._id
                })
            })
            return pIRR
        })
        .then(pIRR => res.status(200).json(pIRR))
        .catch(error => next(error))
})

    router.patch('/update-database', async (req, res, next) => {
        

        LoanSchedule.updateMany({}, { $rename: { tracking: "status" } }, { multi: true }, function(err, blocks) {
            if(err) { throw err; }
            console.log('done!');
        })
        .then( async () => {
            update1 = { $set: {interest_pmt: 0, principal_pmt: 0} }
            query = {interest_pmt: null, principal_pmt: null}
            await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated1: resp}))  
        })
        .then( async () => {
            query = {status: 'closed'}
            update1 = { $set: {status: 'CLOSED'} }
            await Loan.updateMany(query, update1).then( resp => console.log({updated2: resp}))

        })
        .then( async () => {
            update1 = { $set: {status: 'PENDING'} }
            query = {date: {$gte: new Date('2019-05-01')}, status: {$ne: 'DISBURSTMENT'}}
            await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated30: resp}))
        })
        .then( async () => {
            update1 = { $set: {status: 'DUE'} }
            query = {date: {$lte: new Date('2019-04-30'), $gte: new Date('2019-04-01')}, status: {$ne: 'DISBURSTMENT'}}
            await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated31: resp}))
        })
        .then( async () => {
            let newdate = new Date()
            let overdueDate = newdate.setDate(newdate.getDate() - (7));   
            query = {date: {$lte: new Date(overdueDate)}, status: 'DUE'}
            update1 = { $set: {status: 'OVERDUE'} }
            await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated4: resp}))
        })
        .then( async () => {
            query = {status: 'CLOSED'}
            update1 = { $set: {status: 'CLOSED'} }
            await Loan.find(query).select({ "status": 1, "_id": 1, '_borrower': 0, 'loanSchedule': 0, 'investors': 0})
                .then( resp => {
                    return resp = resp.map( e => {return e._id})    
                })
                .then( resp => LoanSchedule.updateMany({_loan: {$in: resp}, status: 'PENDING'}, update1)).then( resp => console.log({updated5: resp}))
        })
        .then( async () => {
            update1 = { $set: {status: 'PAID'} }
            query = {interest_pmt: {$gt: 0}, status: {$ne: 'PAID'}} 
            await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated6: resp}))

        })
        .then( async () => {
            update1 = { $set: {status: 'PAID'} }
            query = {principal_pmt: {$gt: 0}, status: {$ne: 'PAID'}} 
            await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated7: resp}))

        })
        .then( async () => {
            update1 = { $set: {status: 'DISBURSTMENT'} }
            query = {interest: 0, principal: 0, payment: 0}
            await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated8: resp}))
        })
        .then( async () => {
            
            update1 = { $set: {status: 'PAID'} }
            query = {interest_pmt: {$gt: 0}, principal_pmt: {$gt: 0}, status: {$ne: 'PAID'}} 
            await LoanSchedule.updateMany(query, update1).then( resp => console.log({updated9: resp}))
            console.log('ALL DONE!')
        })
    })

    router.use((err, req, res, next) => {
        console.log(err.message)
        res.status(500).json({
            error: true,
            message: err.message
        });
    })

    return router;
}

module.exports = loanCrud;
//AGREGAR 

// let idJulieta = mongoose.Types.ObjectId("5cb6cad93472683c4543c22a")
// let idFernandez = "5c8103dfcf81366c6c0f133a"
// let idCastillo = "5c8103cdcf81366c6c0f1338"


// Transaction.aggregate([
//     {
//       '$match': {
//         'concept': 'INVESTMENT', 
//         'cashAccount': 'REMPERU', 
//         '_investor': mongoose.Types.ObjectId('5cb6cad93472683c4543c22a')
//       }
//     }, {
//       '$group': {
//         '_id': '$_loan', 
//         'firstLoan': {
//           '$first': '$_loan'
//         }
//       }
//     }, {'$project': {
//         '_id': 0
//         }
//     }
//   ]
//  ).then( objList => {
//      return objList.map( e => {return e.firstLoan})
//  }).then( objList => {
//  console.log(objList)
//      return Investment.updateMany( {_loan: {$in: objList}, _investor: idFernandez}, update1 )
//  }).then( objList => res.status(200).json(objList))


// res.status(200).json(objList))

// var bulk = Transaction.collection.initializeOrderedBulkOp();
// bulk.find(query).update(update1);
// bulk.execute(function (error, results) {
//     if (error) {
//         res.status(500).json({error: error})
//     } 
//     res.status(200).json(results)   
// })





// Investor.find({}).then( obj => obj.forEach(function(e){ 
//     User.collection.insert(e) 
// }));


// update2 = {$set: {borrower: true}}
// query = {}
// var bulk = Borrower.collection.initializeOrderedBulkOp();
// bulk.find(query).update(update2);
// bulk.execute(function (error) {
//     console.log(error)                  
// })

// Borrower.find({}).then( obj => obj.forEach(function(e){ 
//     User.collection.insertOne(e) 
// }));


// Investor.collection.drop()
// Borrower.collection.drop()