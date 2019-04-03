const express = require('express');
const router  = express.Router();
const LoanSchedule = require("../models/LoanSchedule")
const Loan = require("../models/Loan")
const Transaction = require("../models/Transaction")
var ObjectID = require('mongodb').ObjectID
const { LoanTotals , CountryLoanTotals} = require('./helpers/totals')

router.get('/totals/:country', async (req,res,next) => {
    
    if (req.params.country === "WORLD") {
      let generalTotals = await LoanTotals()
      let peruTotals =  await CountryLoanTotals('PERU')
      let venTotals =  await CountryLoanTotals('VENEZUELA')
      Promise.all([generalTotals, peruTotals, venTotals])
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


module.exports = router;
