#! /app/bin/node

require('dotenv').config();

const moment = require('moment')
const Loan = require('../models/Loan')
const User = require('../models/User')
const Transaction = require('../models/Transaction')
const Investment = require('../models/Investment')
const LoanSchedule = require('../models/LoanSchedule')
const mongoose = require('mongoose')

const dueReview = async () => {

    mongoose.connect(process.env.DBURL, {
    auto_reconnect:true,
    useNewUrlParser: true
    })
    .then( () => { console.log(`Connected to Mongo on ${process.env.DBURL}`)})
    .then( async () => {
        await User.find({country: {$nin: ['DOMINICAN_REPUBLIC', undefined]}}).select({"loans": 1, "_id": 0, "country":1})
        .then( async r => {
            ids = r.reduce((acc, val) => acc.concat(val.loans), [])
            let l = await Loan.updateMany({_id: {$in: ids}}, { $set: {currency: "USD"}})
                .then( () => console.log('done modifying loans to USD'))
            let ls = await LoanSchedule.updateMany({_loan: {$in: ids}}, { $set: {currency: "USD"}})
                .then( () => console.log('done modifying schedules to USD'))
            let t = await Transaction.updateMany({_loan: {$in: ids}}, { $set: {currency: "USD"}})
                .then( () => console.log('done modifying transactions to USD'))
            let i = await Investment.updateMany({_loan: {$in: ids}}, { $set: {currency: "USD"}})
                .then( () => console.log('done modifying transactions to USD'))
        })
    })
    .then( async () => {
        await User.find({country: "DOMINICAN_REPUBLIC"}).select({"loans": 1, "_id": 0, "country":1})
        .then( async r => {
            ids = r.reduce((acc, val) => acc.concat(val.loans), [])
            let l =  await Loan.updateMany({_id: {$in: ids}}, { $set: {currency: "DOP"}})
                .then( () => console.log('done modifying loans to DOP'))
            let ls = await LoanSchedule.updateMany({_loan: {$in: ids}}, { $set: {currency: "DOP"}})
                .then( () => console.log('done modifying schedule to DOP'))
            let t =  await Transaction.updateMany({_loan: {$in: ids}}, { $set: {currency: "DOP"}})
                .then( () => console.log('done modifying transactions to DOP'))
            let i =  await Investment.updateMany({_loan: {$in: ids}}, { $set: {currency: "DOP"}})
                .then( () => console.log('done modifying transactions to DOP'))
        })
    })
    .then( async () => { await Investment.updateMany({currency: "DOP"}, {$mul: {amount: 50.5612 }})
        .then( () => console.log("UPDATED Investment TRANSACTIONS")) })
    .then( async () => { await Loan.updateMany({currency: "DOP"}, {$mul: {capital: 50.5612, collateralValue: 50.5612, capitalRemaining: 50.5612 }})
        .then( () => console.log("LOAN FIELDS UPDATED")) })
    .then( async () => { await LoanSchedule.updateMany({currency: "DOP"}, {$mul: {interest: 50.5612, principal: 50.5612, balance: 50.5612, payment: 50.5612 }})
        .then( () => console.log("UPDATED LOAN SCHEDULE FIELDS")) })
    .then( async () => { await Transaction.updateMany({currency: "DOP"}, {$mul: {debit: 50.5612, credit: 50.5612 }})
        .then( () => console.log("UPDATED DEBIT AND CREDIT TRANSACTIONS")) })
    .catch(err => { console.error('Error connecting to mongo', err)});
    }

dueReview()

