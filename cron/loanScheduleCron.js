const cron = require('node-cron');
const moment = require('moment')
const LoanSchedule =require('../models/LoanSchedule')

cron.schedule('* * 1 1-12 *', () => {
    let begMonth = moment().startOf('month')
    let endMonth =moment().endOf('month')
    updateToDue = { $set: {status: 'DUE'} }
    queryPending = {date: {$lte: endMonth, $gte: begMonth}, status: 'PENDING'}
    queryClosedLoans = {status: 'CLOSED'}
    updateToClosed = { $set: {status: 'CLOSED'} }

    LoanSchedule.updateMany(queryPending, updateToDue).then( objList => console.log({Updated: objList}))
    Loan.find(queryClosedLoans).select({ "status": 1, "_id": 1, '_borrower': 0, 'loanSchedule': 0, 'investors': 0})
        .then( resp => {
            return resp = resp.map( e => {return e._id})
        })
        .then( resp => LoanSchedule.updateMany({_loan: {$in: resp}}, updateToClosed))
        .then( objList => console.log({Updated: objList}))
});

cron.schedule('0 0 0 * * *', () => {
    overdueDate = moment().subtract(7, 'd');
    updateToOverdue = { $set: {status: 'OVERDUE'} }
    query = {date: {$lte: startdate}, status: 'DUE'}
    LoanSchedule.updateMany(query, updateToDue).then( objList => console.log({Updated: objList}))
});


