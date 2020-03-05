const express = require('express');
const _ = require('lodash')
const router = express.Router();
const {
  investorDetails,
  investorTransactions,
  investorTxBook,
  investorAllTxBook
} = require('./helpers/investorAggregates')
const Transaction = require("../models/Transaction")
const LoanSchedule = require("../models/LoanSchedule")
const User = require("../models/User")

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
  if (country === 'GLOBAL' || country === 'VENEZUELA') {
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


router.get('/all/investor/:id', async (req, res, next) => {
  let {
    id
  } = req.params

  investorAllTxBook(id)
    .then(result => {
      res.status(200).json(result)
    })
    .catch(e => {
      next(e)
    })
})

router.get('/investor/:id/:page/:pageSize', async (req, res, next) => {
  let {
    id,
    page,
    pageSize
  } = req.params

  investorTxBook(id, page, pageSize)
    .then(result => {
      res.status(200).json(result)
    })
    .catch(e => {
      next(e)
    })
})



router.get('/updateCashLoanTx', (req, res, next) => {
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

// router.get('/adjustment-gfgc', (req, res, next) => {
//   Transaction.find({
//     _investor: {
//       $in: ['5c8103dfcf81366c6c0f133a', '5cd19be0821e200017b6fec2']
//     }, 
//     concept: 'INVESTMENT',
//     date
//   })
// })

router.get('/null-ref', (req, res, next) => {
  Transaction.find({
      concept: 'COMMISSION'
    }).select({
      _investor: 1,
      _loan: 1
    }).lean()
    .then(async response => {

      let nulls = []

      let rrd = await User.findOne({
        firstName: 'Ribo Capital',
        lastName: 'RD'
      })

      rrid = rrd._id

      await response.forEach(async e => {
        check = await User.findById(e._investor)

        if (check === null) {
          console.log(e._id)
          Transaction.findByIdAndUpdate({
            _id: e._id
          }, {
            _investor: rrid
          }).then(console.log)
        }
      })

      return 'Done'
    })
    .then(objList => res.status(200).json(objList))
    .catch(e => next(e))
})


router.post('/', (req, res, next) => {
  Transaction.create(req.body)
    .then(obj => {
      res.status(200).json(obj)
    })
    .catch(e => {
      next(e)
    })
})



module.exports = router;