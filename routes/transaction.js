const express = require('express');
const _ = require('lodash')
const router = express.Router();
const {
  investorDetails,
  investorInvestmentsDetails
} = require('./helpers/investorAggregates')
const Transaction = require("../models/Transaction")
const LoanSchedule = require("../models/LoanSchedule")

var ObjectID = require('mongodb').ObjectID


router.get('/totals', (req, res, next) => {
  Transaction.aggregate([{
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
    }])
    .then(obj => res.status(200).json(obj))
    .catch(e => next(e))
})

router.get('/totals/:country', async (req, res, next) => {
  let {
    country
  } = req.params
  if (country === 'WORLD' || country === 'VENEZUELA') {
    Transaction.aggregate([{
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
      }])
      .then(obj => {
        res.status(200).json(obj)
      })
      .catch(e => next(e))
  } else {
    Transaction.aggregate([{
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
      }])
      .then(obj => {
        res.status(200).json(obj)
      })
      .catch(e => next(e))
  }
})


router.get('/list/:id', async (req, res, next) => {
  let {
    id
  } = req.params

  investorDetails(id)
    .then(result => {
      res.status(200).json(result)
    })
    .catch(e => {
      next(e)
    })
})





router.get('/loaninvestordetails/:id', (req, res, next) => {
  let {
    id
  } = req.params

  investorInvestmentsDetails(id)
    .then(result => res.status(200).json(result))
    .catch(e => {
      return next(e)
    })

})

router.get('/updateCashLoanTx', (req, res, next) => {
  console.log("a")
  Transaction.aggregate(
    [{
      '$match': {
        '_loanSchedule': {
          '$ne': null
        }
      }
    }, {
      '$project': {
        '_id': 0,
        '_loanSchedule': 1,
        'cashAccount': 1
      }
    }]
  ).then(async obj => {
    let txs = _.uniqWith(obj, _.isEqutxsl);
    return txs
  }).then(obj =>
    obj.forEach((e) => {
      LoanSchedule.findByIdAndUpdate(e._loanSchedule, {
        $set: {
          cashAccount: e.cashAccount
        }
      }).then(obj => console.log(obj, 'done'))
    })
  ).then(() => console.log('all done'))
})


router.get('/', (req, res, next) => {
  Transaction.find()
    .then(objList => res.status(200).json(objList))
    .catch(e => next(e))
})


router.post('/', (req, res, next) => {
  Transaction.create(req.body)
    .then(obj => {
      console.log(obj)
      res.status(200).json(obj)
    })
    .catch(e => {
      console.log(e)
      next(e)
    })
})



module.exports = router;