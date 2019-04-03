const express = require('express');
const router  = express.Router();
const Transaction = require("../models/Transaction")
const mongoose   = require('mongoose')
const Loan = require("../models/Loan")
const Investor = require("../models/Investor")
const Borrower = require("../models/Borrower")
const User = require("../models/User")
const LoanSchedule = require("../models/LoanSchedule")
const Investment = require("../models/Investment")
const _ = require('lodash');
const moment = require('moment')
const transactionPlacer = require('./helpers/transactionPlacer')
const { linearLoan, lumpSumLoan } = require('./helpers/loanSchedule')


router.post('/create',(req,res,next) => {
    console.log(req.body)
    let notUsedPaths = ['_id','updated_at','created_at','__v'];
    let paths = Object.keys(Loan.schema.paths).filter(e => !notUsedPaths.includes(e));
    
    const loanDetails = _.pickBy(req.body, (e,k) => paths.includes(k));
    let { _borrower, interest, duration, capital, loanType, startDate, toInvest} = req.body 
    Loan.create(req.body)
        .then( obj => {
            
            let loanId = obj._id
            let schedule

            if (loanType === 'linear'){
                schedule = linearLoan(loanId, duration, interest, capital, startDate)
            } else {
                console.log("aqui")
                
                schedule = lumpSumLoan(loanId, duration, interest, capital, startDate)
            }
            schedule.forEach( e => {
                LoanSchedule.create(e)
                .then( (schedule_t) => {
                    Loan.findByIdAndUpdate(loanId,
                        {$push: {loanSchedule: schedule_t._id}},
                        {safe: true, upsert: true})
                    .then()
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
                console.log(credit)
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
            console.log(pendingTransactions)
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
    console.log(req.body.payment)
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

    updates = {
        interest_pmt: 0,
        principal_pmt: 0,
    }

    LoanSchedule.findByIdAndUpdate(id, updates, {new:true})
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

router.delete('/:id',(req,res,next) => {
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
    
    Promise.all([Investors,LoanDetails])
        .then( objList => 
            res.status(200).json
            ({
                investors: objList[0],
                details: objList[1]
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

router.patch('/joincollections', (req, res, next) => {

    
    update1 = {$set: {investor: true}}
    query = {}
    var bulk = Investor.collection.initializeOrderedBulkOp();
    bulk.find(query).update(update1);
    bulk.execute(function (error) {
        console.log(error)                  
    })
    
    
    
    Investor.find({}).then( obj => obj.forEach(function(e){ 
        User.collection.insert(e) 
    }));
    
    
    update2 = {$set: {borrower: true}}
    query = {}
    var bulk = Borrower.collection.initializeOrderedBulkOp();
    bulk.find(query).update(update2);
    bulk.execute(function (error) {
        console.log(error)                  
    })
    
    Borrower.find({}).then( obj => obj.forEach(function(e){ 
        User.collection.insertOne(e) 
    }));
    
    
    // Investor.collection.drop()
    // Borrower.collection.drop()
        

})

module.exports = router;
