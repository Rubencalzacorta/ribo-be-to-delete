#! /app/bin/node
const moment = require('moment')
const LoanSchedule = require('../models/LoanSchedule')
const Loan = require('../models/Loan')
const mongoose = require('mongoose')

Loan.find({}).then(console.log)
const dueReview = () => {
    
    let begMonth = moment()
    let endMonth = moment().add(30, 'd')
    let queryPending = {date: {$lte: endMonth, $gte: begMonth}, status: 'PENDING'}
    let updateToDue = { $set: {status: 'DUE'} }
    let queryClosedLoans = {status: 'CLOSED'}
    let updateToClosed = { $set: {status: 'CLOSED'} }
    
    LoanSchedule.updateMany(queryPending, updateToDue).exec()
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
}

// dueReview()


