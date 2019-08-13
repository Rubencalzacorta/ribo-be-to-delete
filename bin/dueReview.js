#! /app/bin/node

require('dotenv').config();

const moment = require('moment')
const LoanSchedule = require('../models/LoanSchedule')
const Loan = require('../models/Loan')
const mongoose = require('mongoose')
const dueReview = async () => {

    let begMonth = moment()
    let endMonth = moment().add(30, 'd')
    let queryPending = {
        date: {
            $lte: endMonth,
            $gte: begMonth
        },
        status: 'PENDING'
    }
    let updateToDue = {
        $set: {
            status: 'DUE'
        }
    }
    let queryClosedLoans = {
        status: 'CLOSED'
    }
    let updateToClosed = {
        $set: {
            status: 'CLOSED'
        }
    }
    let overdueDate = moment().subtract(7, 'd');
    let queryDue = {
        date: {
            $lte: overdueDate
        },
        status: 'DUE'
    }
    let updateToOverdue = {
        $set: {
            status: 'OVERDUE'
        }
    }

    mongoose.connect('mongodb://ribo-cap-admin:233586364Mgb@ds359147-a0.mlab.com:59147,ds359147-a1.mlab.com:59147/ribo?replicaSet=rs-ds359147', {
            auto_reconnect: true,
            useNewUrlParser: true
        })
        .then(() => {
            console.log(`Connected to MongoDB`)
        })
        .then(() => LoanSchedule.updateMany(queryPending, updateToDue))
        .then(objList => console.log({
            Updated: objList
        }))
        .then(async (e) => {
            await LoanSchedule.updateMany(queryDue, updateToOverdue).then(resp => console.log({
                updated: resp
            }))
        })
        .then(async () => {
            await Loan.find(queryClosedLoans).select({
                    "status": 1,
                    "_id": 1,
                    '_borrower': 0,
                    'loanSchedule': 0,
                    'investors': 0
                })
                .then(resp => {
                    return resp = resp.map(e => {
                        return e._id
                    })
                })
                .then(resp => LoanSchedule.updateMany({
                    _loan: {
                        $in: resp
                    }
                }, updateToClosed))
                .then(objList => console.log({
                    Updated: objList
                }))
        })
        .then(async () => {
            await mongoose.connection.close()
        })
        .catch(err => {
            console.error('Error connecting to mongo', err)
        });
}

dueReview()