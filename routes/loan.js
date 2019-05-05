const express = require('express');
const router  = express.Router();
const mongoose   = require('mongoose')
const _ = require('lodash');
const moment = require('moment')
const LoanSchedule = require("../models/LoanSchedule")
const Transaction = require("../models/Transaction")
const Investment = require("../models/Investment")
const Loan = require("../models/Loan")
const User = require("../models/User")
const transactionPlacer = require('./helpers/transactionPlacer')
const { linearLoan, 
        lumpSumLoan, 
        linearLoanIntFirst, 
        payDayLoan } = require('./helpers/loanSchedule')
const {
    countryPaidQuery,
    countryAllLoansQuery,
    countryDueQuery,
    countryOverdueQuery,
    allLoansQuery,
    paidQuery,
    dueQuery,
    overdueQuery
} = require('./helpers/aggregates')


router.post('/create',(req,res,next) => {
    let notUsedPaths = ['_id','updated_at','created_at','__v'];
    let paths = Object.keys(Loan.schema.paths).filter(e => !notUsedPaths.includes(e));
    
    const loanDetails = _.pickBy(req.body, (e,k) => paths.includes(k));
    let { _borrower, period, interest, duration, capital, loanType, startDate, paymentDate, toInvest} = req.body 
    console.log(req.body)
    Loan.create(req.body)
        .then( obj => {

            let loanId = obj._id
            let schedule
            
            if (loanType === 'linear') {
                schedule = linearLoan(loanId, period, duration, interest, capital, startDate)
            } else if (loanType === 'lumpSum') {
                schedule = lumpSumLoan(loanId, period, duration, interest, capital, startDate)
            } else if (loanType === 'linearIntFirst') {
                schedule = linearLoanIntFirst(loanId, period, duration, interest, capital, startDate, paymentDate)
            } else {
                schedule = payDayLoan(loanId, period, duration, interest, capital, startDate)
            }
            
            console.log(schedule)
            schedule.forEach( e => {
                LoanSchedule.create(e)
                .then( (schedule_t) => {
                    Loan.findByIdAndUpdate(loanId,
                        {$push: {loanSchedule: schedule_t._id}},
                        {safe: true, upsert: true}).exec()
                })
            })
            return obj;
        })
        .then( obj => {
            let loanId = obj._id
            let investments = toInvest.map( e => ({_loan: loanId, ...e}))
            investments.forEach( e => { 
                Investment.create(e)
                .then( (investment_x) => {
                    Loan.findByIdAndUpdate(loanId,
                        {$push: {investors: investment_x._id}},
                        {safe: true, upsert: true}).exec()
                    User.findByIdAndUpdate(e._investor,
                        {$push: {investments: investment_x._id}},
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
            let investments = toInvest.map( e => ({_loan: loanId, ...e}))
            pendingTransactions = []
            investments.forEach( e => { 
                let credit = e.amount
                let transaction = {
                    _loan: e._loan,
                    _investor: mongoose.Types.ObjectId(e._investor),
                    date: startDate,
                    cashAccount: e.cashAccount,
                    concept: 'INVESTMENT',
                    credit: credit
                }
                pendingTransactions.push(transaction)
            })
            Transaction.insertMany(pendingTransactions)
            return obj
        })
        .then( obj => res.status(200).json(obj))
        .catch(e => next(e))
})

router.patch('/installmentpmt/:id',(req,res,next) => {
        
    
    let notUsedPaths = ['_id','updated_at','created_at','__v'];
    let paths = Object.keys(LoanSchedule.schema.paths).filter(e => !notUsedPaths.includes(e));
    
    const {id} = req.params;

    const { cashAccount, fee, interest_pmt, principal_pmt, date_pmt } = req.body.payment
    const object = _.pickBy(req.body.payment, (e,k) => paths.includes(k));
    const updates = _.pickBy(object, _.identity);

    LoanSchedule.findByIdAndUpdate(id, updates, {new:true})
        .then( obj => {
            return Investment.find({_loan: obj._loan}).populate('_investor').exec()
        })
        .then( investors => {
            let pendingTransactions = transactionPlacer(investors, cashAccount, fee, interest_pmt, principal_pmt, date_pmt, id)
            Transaction.insertMany(pendingTransactions)
            return investors
        })
        .then( investors => res.status(200).json(investors))
        .catch(e => next(e))
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
                status: 'PENDING'
            }
        } else if (moment(resp.date) <= moment() && moment(resp.date) > moment().subtract(7, 'd')) {
            return {
                interest_pmt: 0,
                principal_pmt: 0,
                status: 'DUE'
            }
        } else {
            return {
                interest_pmt: 0,
                principal_pmt: 0,
                status: 'OVERDUE'
            }
        }})
    .then( (updates) => { LoanSchedule.findByIdAndUpdate(id, updates, {new:true}).exec()})
    .then( () => {Transaction.find({_loanSchedule: mongoose.Types.ObjectId(id)}).remove().exec()})
    .then( () => res.status(200).json({status: "Success", message: "Removed Successfully"}))
    .catch(e => next(e))
})

router.get('/',(req,res,next) => {
    Loan.find()
        .then( objList => res.status(200).json(objList))
        .catch(e => next(e))
})

router.get('/open',(req,res,next) => {
    Loan.find({status: "open"})
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

    let Investors = await Investment.find({_loan: id}).populate('_investor')
    let LoanDetails = await Loan.findById(id)
    let Transactions = await Transaction.find({_loan: id})
    
    Promise.all([Investors,LoanDetails,Transactions])
        .then( objList => 
            res.status(200).json
            ({
                investors: objList[0],
                details: objList[1],
                transactions: objList[2]
            }))
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
                'details.status': 'open', 
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
                'details.status': 'open', 
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
    let allLoansSearch, paidQuerySearch, dueQuerySearch, overdueQuerySearch

    if (country === 'WORLD') {
        allLoansSearch = await LoanSchedule.aggregate(allLoansQuery(fromDate, toDate))
        paidQuerySearch = await LoanSchedule.aggregate(paidQuery(fromDate, toDate))
        dueQuerySearch = await LoanSchedule.aggregate(dueQuery(fromDate, toDate))
        overdueQuerySearch = await LoanSchedule.aggregate(overdueQuery())
    } else {
        allLoansSearch = await LoanSchedule.aggregate(countryAllLoansQuery(country, fromDate, toDate))
        paidQuerySearch = await LoanSchedule.aggregate(countryPaidQuery(country, fromDate, toDate))
        dueQuerySearch = await LoanSchedule.aggregate(countryDueQuery(country,fromDate, toDate))
        overdueQuerySearch = await LoanSchedule.aggregate(countryOverdueQuery(country))
    }
    
    Promise.all([allLoansSearch, paidQuerySearch, dueQuerySearch, overdueQuerySearch])
        .then( objList => {

            let unique1 = objList[0].map( e => {return (e._id).toString()})
            let unique2 = objList[2].map( e => {return (e._id).toString()})
            console.log(unique1.length, unique2.length)
            unique12 = unique1.filter((o) => unique2.indexOf(o) === -1);
            unique22 = unique2.filter((o) => unique1.indexOf(o) === -1);

            const unique = unique12.concat(unique22);

            console.log(unique);

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
                }
            }
            return periodDetails

        }).then( periodDetails => res.status(200).json(periodDetails))
})

router.patch('/update-due', (req, res, next) => {
    console.log('aqui')
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


router.patch('/update-database', async (req, res, next) => {
    console.log('aqui')

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
        

})

module.exports = router;
