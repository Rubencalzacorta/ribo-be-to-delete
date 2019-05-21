const express = require('express');
const router  = express.Router();
const Transaction = require("../models/Transaction")
var ObjectID = require('mongodb').ObjectID

router.get('/totals',(req,res,next) => {
    Transaction.aggregate([
            {
              '$project': {
                '_investor': 1, 
                'total': {
                  '$subtract': [
                    '$debit', '$credit'
                  ]
                }
              }
            }, {
              '$group': {
                '_id': '$_investor', 
                'accumTotal': {
                  '$sum': '$total'
                }
              }
            }, {
              '$lookup': {
                'from': 'users', 
                'localField': '_id', 
                'foreignField': '_id', 
                'as': 'investor'
              }
            }
      ])
      .then( obj => res.status(200).json(obj))
      .catch(e => next(e))
})

router.get('/totals/:country', async (req,res,next) => {
  let { country } = req.params
  if ( country === 'WORLD' || country === 'VENEZUELA') {
    Transaction.aggregate([
      {
        '$project': {
          '_investor': 1, 
          'cashAccount': 1, 
          'total': {
            '$subtract': [
              '$debit', '$credit'
            ]
          }
        }
      }, {
        '$group': {
          '_id': {
            'investor': '$_investor', 
            'cashAccount': '$cashAccount'
          }, 
          'accumTotal': {
            '$sum': '$total'
          }
        }
      }, {
        '$project': {
          'investor': '$_id.investor', 
          'cashAccount': '$_id.cashAccount', 
          'accumTotal': '$accumTotal', 
          '_id': 0
        }
      }, {
        '$lookup': {
          'from': 'users', 
          'localField': 'investor', 
          'foreignField': '_id', 
          'as': 'investor'
        }
      }
    ])
              .then( obj => {
                console.log(obj)
                res.status(200).json(obj)})
              .catch(e => next(e))
  } else {
        Transaction.aggregate([
          {
            '$lookup': {
              'from': 'users', 
              'localField': '_investor', 
              'foreignField': '_id', 
              'as': 'details'
            }
          }, {
            '$unwind': {
              'path': '$details'
            }
          }, {
            '$match': {
              'details.location': `${country}`
            }
          }, {
            '$project': {
              '_investor': 1, 
              'cashAccount': 1, 
              'total': {
                '$subtract': [
                  '$debit', '$credit'
                ]
              }
            }
          }, {
            '$group': {
              '_id': {
                'investor': '$_investor', 
                'cashAccount': '$cashAccount'
              }, 
              'accumTotal': {
                '$sum': '$total'
              }
            }
          }, {
            '$project': {
              'investor': '$_id.investor', 
              'cashAccount': '$_id.cashAccount', 
              'accumTotal': '$accumTotal', 
              '_id': 0
            }
          }, {
            '$lookup': {
              'from': 'users', 
              'localField': 'investor', 
              'foreignField': '_id', 
              'as': 'investor'
            }
          }
        ])
    .then( obj => {console.log(obj)
      res.status(200).json(obj)})
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



router.get('/loaninvestordetails/:id',(req,res,next) => {
  let { id } = req.params
  let investor = new ObjectID(id)
  Transaction.find({'_investor': investor}, null, {sort: {date: 1}})
    .populate({path: '_loan', populate: {path: '_borrower'}})
    .populate({path: '_investor'})
    .then( async baseData => {

      let result = await Object.values(baseData.reduce((c, {_loan, concept, credit, debit}) => {
        if (!_loan){
          return c
        } else  {
        c[_loan._id] = c[_loan._id] || {loan: _loan._id, amount: _loan.capital, name: _loan._borrower.firstName+" "+_loan._borrower.lastName ,feeIncome: 0, feeExpense: 0, interest: 0, capital: 0, investment: 0, ownership: 0};
        if (concept == 'FEE' && debit > 0){
          c[_loan._id].feeIncome += debit;
        } else if (concept == 'FEE' && credit > 0) {
          c[_loan._id].feeExpense += credit;
        } else if (concept == 'INTEREST') {
          c[_loan._id].interest += parseFloat(debit) - parseFloat(credit);
        } else if (concept == 'CAPITAL') {
          c[_loan._id].capital += parseFloat(debit) - parseFloat(credit);
        } else if (concept == 'INVESTMENT') {
          c[_loan._id].investment += parseFloat(debit) - parseFloat(credit);
          c[_loan._id].ownership += -1*(parseFloat(debit) - parseFloat(credit))/c[_loan._id].amount;
        }
        return c;
        }
      }, {}));
      return result })
    .then( result => res.status(200).json(result))
    .catch( e => next(e))

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
