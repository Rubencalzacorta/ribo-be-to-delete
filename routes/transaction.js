const express = require('express');
const _ = require('lodash')
const router = express.Router();
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








router.get('/list/:id', (req, res, next) => {
  let {
    id
  } = req.params
  // console.log(id)
  Transaction.find({
      '_investor': new ObjectID(id)
    }, null, {
      sort: {
        date: 1
      }
    })
    .populate({
      path: '_loan',
      populate: {
        path: '_borrower'
      }
    })
    .populate({
      path: '_investor'
    })
    .then(async obj => {

      return await investorDetails(obj)

    }).then(obj => {

      res.status(200).json(obj)
    })
    .catch(e => next(e))
})





router.get('/loaninvestordetails/:id', (req, res, next) => {
  let {
    id
  } = req.params
  let investor = new ObjectID(id)
  Transaction.find({
      '_investor': investor
    }, null, {
      sort: {
        date: 1
      }
    })
    .populate({
      path: '_loan',
      populate: {
        path: '_borrower'
      }
    })
    .populate({
      path: '_investor'
    })
    .then(async baseData => {

      let result = await Object.values(baseData.reduce((c, {
        _loan,
        concept,
        credit,
        debit
      }) => {
        if (!_loan) {
          return c
        } else {
          c[_loan._id] = c[_loan._id] || {
            loan: _loan._id,
            amount: _loan.capital,
            name: _loan._borrower.firstName + " " + _loan._borrower.lastName,
            feeIncome: 0,
            feeExpense: 0,
            interest: 0,
            capital: 0,
            investment: 0,
            ownership: 0
          };
          if (concept == 'FEE' && debit > 0) {
            c[_loan._id].feeIncome += debit;
          } else if (concept == 'FEE' && credit > 0) {
            c[_loan._id].feeExpense += credit;
          } else if (concept == 'INTEREST') {
            c[_loan._id].interest += parseFloat(debit) - parseFloat(credit);
          } else if (concept == 'CAPITAL') {
            c[_loan._id].capital += parseFloat(debit) - parseFloat(credit);
          } else if (concept == 'INVESTMENT') {
            c[_loan._id].investment += parseFloat(debit) - parseFloat(credit);
            c[_loan._id].ownership += -1 * (parseFloat(debit) - parseFloat(credit)) / c[_loan._id].amount;
          }
          return c;
        }
      }, {}));
      return result
    })
    .then(result => res.status(200).json(result))
    .catch(e => next(e))

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
    .then(obj => res.status(200).json(obj))
    .catch(e => next(e))
})


const investorDetails = (transactions) => {

  let paidBackCapital = transactions.filter((e) => {
    return (e.concept === 'CAPITAL')
  }).reduce((acc, e) => {
    return acc + e.debit
  }, 0)

  let interestReceived = transactions.filter((e) => {
    return (e.concept === 'INTEREST')
  }).reduce((acc, e) => {
    return acc + e.debit
  }, 0)

  let feeExpenses = transactions.filter((e) => {
    return (e.concept === 'FEE')
  }).reduce((acc, e) => {
    return acc + e.credit
  }, 0)

  let feeIncome = transactions.filter((e) => {
    return (e.concept === 'FEE')
  }).reduce((acc, e) => {
    return acc + e.debit
  }, 0)

  let totalDeposits = transactions.filter((e) => {
    return (e.concept === 'DEPOSIT')
  }).reduce((acc, e) => {
    return acc + e.debit
  }, 0)

  let totalWithdrawals = transactions.filter((e) => {
    return (e.concept === 'WITHDRAWAL')
  }).reduce((acc, e) => {
    return acc + e.credit
  }, 0)

  let totalCosts = transactions.filter((e) => {
    return (e.concept === 'COST')
  }).reduce((acc, e) => {
    return acc + e.credit
  }, 0)

  let totalInvestments = transactions.filter((e) => {
    return (e.concept === 'INVESTMENT')
  }).reduce((acc, e) => {
    return acc + e.credit
  }, 0)

  const cashAccountReducer = (transactions) => {
    let accountList = []
    let totals = []

    _.map(_.uniqBy(transactions, 'cashAccount'), _.partial(_.pick, _, ['cashAccount'])).forEach(e => {
      accountList.push(e.cashAccount)
    })

    accountList.forEach(e => {
      let total = transactions.filter((j) => {
          return (j.cashAccount === e)
        })
        .reduce((acc, k) => {
          return acc + k.debit - k.credit
        }, 0)

      let cashAccountTotal = {
        cashAccount: e,
        total: total
      }
      totals.push(cashAccountTotal)
    })
    return totals
  }



  // const feesReducer = (transactions) => {
  //   let accountList = []
  //   let totals = []

  //   let fees = transactions.filter((e) => {
  //     return (e.concept === 'FEE')
  //   })



  //   _.map(_.uniqBy(fees, '_investor'), _.partial(_.pick, _, ['_investor'])).forEach(e => { accountList.push(e._investor.firstName) })


  //   accountList.forEach(e => {
  //     let total = fees.filter((j) => { return (j._investor.firstName === e) })
  //       .reduce((acc, k) => { return acc + k.debit - k.credit }, 0)

  //     let cashAccountTotal = { cashAccount: e, total: total }
  //     totals.push(cashAccountTotal)
  //   })
  //   return totals
  // }

  let totals = cashAccountReducer(transactions)

  let debitTotal = transactions.reduce((acc, e) => {
    return acc + e.debit
  }, 0)
  let creditTotal = transactions.reduce((acc, e) => {
    return acc + e.credit
  }, 0)

  return {
    transactions: transactions,
    paidBackCapital: paidBackCapital,
    interestReceived: interestReceived,
    totalInvestments: totalInvestments,
    totalCosts: totalCosts,
    feeExpenses: feeExpenses,
    feeIncome: feeIncome,
    totalDeposits: totalDeposits,
    totalWithdrawals: totalWithdrawals,
    debitTotal: debitTotal,
    creditTotal: creditTotal,
    cashAvailable: debitTotal - creditTotal,
    cashAccounts: totals
  }
}

module.exports = router;