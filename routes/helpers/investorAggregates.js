const mongoose = require('mongoose')
const Transaction = require('../../models/Transaction')
const Investment = require('../../models/Investment')
const User = require('../../models/User')
var ObjectID = require('mongodb').ObjectID

conceptAggregates = (concept, id) => {
  return [{
      '$match': {
        '_investor': mongoose.Types.ObjectId(id),
        'concept': concept
      }
    }, {
      '$project': {
        'available': {
          '$subtract': [
            '$debit', '$credit'
          ]
        },
        'date': 1,
        'credit': 1,
        'debit': 1,
        'comment': 1,
        'created_at': 1,
        'updated_at': 1,
        '_investor': 1,
        'cashAccount': 1,
        'concept': 1
      }
    }, {
      '$group': {
        '_id': {
          'month': {
            '$month': '$date'
          },
          'year': {
            '$year': '$date'
          }
        },
        'available': {
          '$sum': '$available'
        }
      }
    },
    {
      '$project': {
        '_id': 0,
        'date': {
          '$dateFromParts': {
            'year': '$_id.year',
            'month': '$_id.month'
          }
        },
        'available': 1,
      }
    }, {
      '$sort': {
        'date': 1
      }
    }
  ]
}

accountTotalsByLocation = (country) => {
  return Transaction.aggregate([{
    '$project': {
      '_investor': 1,
      'cashAccount': 1,
      'debit': {
        '$divide': [{
            '$subtract': [{
                '$multiply': ['$debit', 10000]
              },
              {
                '$mod': [{
                  '$multiply': ['$debit', 10000]
                }, 1]
              }
            ]
          },
          10000
        ]
      },
      'credit': {
        '$divide': [{
            '$subtract': [{
                '$multiply': ['$credit', 10000]
              },
              {
                '$mod': [{
                  '$multiply': ['$credit', 10000]
                }, 1]
              }
            ]
          },
          10000
        ]
      }
    }
  }, {
    '$project': {
      '_investor': 1,
      'cashAccount': 1,
      'dayBalance': {
        '$subtract': [
          '$debit', '$credit'
        ]
      }
    }
  }, {
    '$group': {
      '_id': {
        'cashAccount': '$cashAccount',
        '_investor': '$_investor'
      },
      'total': {
        '$sum': '$dayBalance'
      }
    }
  }, {
    '$project': {
      '_id': 0,
      'cashAccount': '$_id.cashAccount',
      '_investor': '$_id._investor',
      'total': 1
    }
  }, {
    '$lookup': {
      'from': 'users',
      'localField': '_investor',
      'foreignField': '_id',
      'as': 'investord'
    }
  }, {
    '$unwind': {
      'path': '$investord'
    }
  }, {
    '$project': {
      'total': 1,
      'cashAccount': 1,
      '_investor': 1,
      'location': '$investord.location',
      'isAutoInvesting': '$investord.isAutoInvesting',
      'fullName': 1
    }
  }, {
    '$match': {
      'isAutoInvesting': true,
      'location': country,
      'total': {
        '$gt': 0
      }
    }
  }])
}


investorsAutoInvesting = async (location) => {
  return await User.aggregate([{
    '$match': {
      'isAutoInvesting': true,
      'location': location
    }
  }, {
    '$project': {
      '_id': 1
    }
  }])
}


calculateTotalCashAvailable = (accTotals) => {

  return accTotals.reduce((acc, e) => {
    return acc + rounder(e.total)
  }, 0)
}

calculateAccountPcts = (accs, totalCash) => {
  let accounts = accs.map(e => {
    return {
      ...e,
      pct: rounder((e.total / totalCash))
    }
  })
  return accounts
}

generateInvestments = (loanAmount, loanId, currency, investors) => {
  let investments = []
  let a = 0
  investors.forEach(e => {
    a += e.pct * loanAmount
    investments.push({
      _investor: e._investor,
      _loan: loanId,
      currency: currency,
      pct: e.pct,
      amount: e.pct * loanAmount,
      cashAccount: e.cashAccount
    })
  })

  return investments

}

cashAvailabilityValidator = async (location, loanAmount, next) => {
  let accounts = await accountTotalsByLocation(location)
  let totalCashAvailable = await calculateTotalCashAvailable(accounts)
  if (parseFloat(loanAmount) > totalCashAvailable) {
    return {
      status: false,
      cash: totalCashAvailable
    }
  } else {
    return {
      status: true,
      cash: totalCashAvailable
    }
  }
}


investmentDistributor = async (location, loanAmount, loanId, currency) => {
  let accounts = await accountTotalsByLocation(location)
  let totalCashAvailable = await calculateTotalCashAvailable(accounts)
  let investors = await calculateAccountPcts(accounts, totalCashAvailable)
  let investments = await generateInvestments(loanAmount, loanId, currency, investors)
  return investments

}

rounder = (numberToRound) => {
  try {
    return Math.round(numberToRound * 10000) / 10000
  } catch (e) {
    return e
  }
}




const transactionTypeTotal = async (id, type, concepts) => {
  let investor = new ObjectID(id)
  let total = await Transaction.aggregate([{
      '$match': {
        '_investor': investor,
        'concept': {
          '$in': concepts
        },
      }
    }, {
      '$group': {
        '_id': null,
        'total': {
          '$sum': `$${type}`
        }
      }
    },
    {
      '$project': {
        '_id': 0,
        'total': 1
      }
    }
  ])
  total = total.length > 0 ? total[0].total : 0
  return total
}

const cashAvailableInvestor = async (id) => {
  let total = await Transaction.aggregate([{
    '$match': {
      '_investor': new ObjectID(id)
    }
  }, {
    '$group': {
      '_id': null,
      'total': {
        '$sum': {
          '$subtract': [
            '$debit', '$credit'
          ]
        }
      }
    }
  }, {
    '$project': {
      'total': 1,
      '_id': 0
    }
  }])

  total = total.length > 0 ? total[0].total : 0
  return total
}

const investorTransactions = async (id, page, pageSize) => {
  let skip
  if (page == 1) {
    skip = 0
  } else {
    skip = (page - 1) * pageSize
  }

  try {
    let txs = await Transaction.find({
        '_investor': new ObjectID(id)
      })
      .sort({
        date: -1
      })
      .skip(skip)
      .limit(parseInt(pageSize))
      .populate({
        path: '_loan',
        select: {
          '_id': 1,
          '_borrower': 1
        },
        populate: {
          path: '_borrower',
          select: {
            '_id': 1,
            'firstName': 1,
            'lastName': 1,
          }
        }
      })
      .populate({
        path: '_investor',
        select: {
          '_id': 1,
          'firstName': 1,
          'lastName': 1
        }
      })
    return txs
  } catch (e) {
    console.log(e)
  }

}


const investorTxBook = async (id, page, pageSize) => {

  accountTotalAccum = await cashAccountTotalReducer(id)
  accountTotalRemainder = await cashAccountTotalReducerRemainder(id, page, pageSize)
  accountTotal = accountTotalAccum[0].account_total - accountTotalRemainder[0].account_total
  investorTxs = await investorTransactions(id, page, pageSize)

  newTxs = []

  investorTxs.forEach((e, i) => {

    let balance = 0
    if (i == 0) {
      balance = accountTotal
    } else {
      balance = rounder(newTxs[i - 1].balance) + rounder(-newTxs[i - 1].debit + newTxs[i - 1].credit)
    }

    return newTxs.push({
      date: e.date,
      fullName: e.concept === 'INSURANCE_PREMIUM' ? 'PRIMA' : e._loan ? e._loan._borrower.firstName + " " + e._loan._borrower.lastName : "PERSONAL",
      concept: e.concept,
      debit: e.debit,
      credit: e.credit,
      balance: balance,
      cashAccount: e.cashAccount,
      comment: e.comment
    })

  })

  return {
    data: newTxs,
    page: page,
    total: accountTotalAccum[0].totalTxs
  }

}


const cashAccountTotals = async (id) => {
  return Transaction.aggregate([{
    '$match': {
      '_investor': new ObjectID(id)
    }
  }, {
    '$group': {
      '_id': {
        'cashAccount': '$cashAccount'
      },
      'total': {
        '$sum': {
          '$subtract': [
            '$debit', '$credit'
          ]
        }
      }
    }
  }, {
    '$project': {
      'cashAccount': '$_id.cashAccount',
      'total': 1,
      '_id': 0
    }
  }])
}

cashAccountTotalReducer = async (id) => {

  return Transaction.aggregate([{
    '$match': {
      '_investor': new ObjectID(id)
    }
  }, {
    '$sort': {
      'date': 1
    }
  }, {
    '$group': {
      '_id': null,
      'account_total': {
        '$sum': {
          '$subtract': [
            '$debit', '$credit'
          ]
        }
      },
      'totalTxs': {
        '$sum': 1
      }
    }
  }])
}

cashAccountTotalReducerRemainder = async (id, page, pageSize) => {

  if (page == 1) {
    return [{
      _id: null,
      account_total: 0
    }]
  }

  let limit

  if (page > 1) {
    limit = (page - 1) * pageSize
  }

  return Transaction.aggregate([{
    '$match': {
      '_investor': new ObjectID(id)
    }
  }, {
    '$sort': {
      'date': -1
    }
  }, {
    '$limit': limit
  }, {
    '$group': {
      '_id': null,
      'account_total': {
        '$sum': {
          '$subtract': [
            '$debit', '$credit'
          ]
        }
      },
      'totalTxs': {
        '$sum': 1
      }
    }
  }])
}

rounder = (numberToRound) => {
  try {
    return Math.round(numberToRound * 10000) / 10000
  } catch (e) {
    return e
  }
}


let investorCashDetails = async (id) => {
  let cashAvailable = await cashAvailableInvestor(id)
  let cashAccounts = await cashAccountTotals(id)

  return Promise.all([cashAvailable, cashAccounts]).then(cashDetails => {
    return {
      cashAvailable: cashDetails[0],
      cashAccounts: cashDetails[1],
    }
  })
}

let investorInvestmentDetails = async (id) => {
  let totalInvestments = await transactionTypeTotal(id, 'credit', ['INVESTMENT'])
  let paidBackCapital = await transactionTypeTotal(id, 'debit', ['CAPITAL'])
  let divestments = await transactionTypeTotal(id, 'debit', ['DIVESTMENT'])

  return Promise.all([
    totalInvestments,
    paidBackCapital,
    divestments
  ]).then(investmentDetails => {
    return {
      totalInvestments: investmentDetails[0],
      paidBackCapital: investmentDetails[1],
      divestments: investmentDetails[2]
    }
  })
}

let investorPLDetails = async (id) => {

  let interestReceived = await transactionTypeTotal(id, 'debit', ['INTEREST'])
  let totalCosts = await transactionTypeTotal(id, 'credit', [
    'COST',
    'COST_ORIGINATION_LEGAL',
    'COST_ORIGINATION_TRANSPORT',
    'COST_ORIGINATION_EXPENSES',
    'COST_ORIGINATION_SENTINEL',
    'COST_SERVICING_LEGAL',
    'COST_SERVICING_TRANSPORT',
    'COST_SERVICING_EXPENSES',
    'SG&A_ACCOUNTING',
    'BANKING_FEE',
    'SG&A_TECH_SERVICES',
    'SG&A_LEGAL',
    'SG&A_MAILING',
    'SG&A_OFFICE_RENT',
    'SG&A_MISCELLANEOUS',
    "SALARY",
    'SG&A_OFFICE_PRINT',
    'SG&A_OFFICE_STORAGE',
    'SG&A_MARKETING',
    'TRAVEL_EXPENSES',
    'TRANSPORT',
    'INSURANCE_COST',
    'INTEREST_COST',
    'UNCLASSIFIED_COST',
    "BANKING_TRANSFER_FEE"
  ])
  let feeExpenses = await transactionTypeTotal(id, 'credit', ['FEE', 'MANAGEMENT_INTEREST_COST', 'MANAGEMENT_FEE_COST', 'COMMISSION_COST'])
  let feeIncome = await transactionTypeTotal(id, 'debit', ['FEE', 'MANAGEMENT_INTEREST_INCOME', 'MANAGEMENT_FEE_INCOME', 'INSURANCE_PREMIUM', 'COMMISSION_INCOME'])

  return Promise.all([
    interestReceived,
    totalCosts,
    feeExpenses,
    feeIncome
  ]).then(PLDetails => {
    return {
      interestReceived: PLDetails[0],
      totalCosts: PLDetails[1],
      feeExpenses: PLDetails[2],
      feeIncome: PLDetails[3]
    }
  })

}

let investorCashMovements = async (id) => {
  let totalDeposits = await transactionTypeTotal(id, 'debit', ['DEPOSIT', 'INTERNAL_TRANSFER_RECIPIENT', 'INTERNATIONAL_TRANSFER_RECIPIENT', 'DIVINDEND_INCOME'])
  let totalWithdrawals = await transactionTypeTotal(id, 'credit', ['WITHDRAWAL', 'INTERNATIONAL_TRANSFER_SENDER', 'INTERNAL_TRANSFER_SENDER', 'DIVIDENDS'])

  return Promise.all([
    totalDeposits,
    totalWithdrawals,
  ]).then(cashDetails => {
    return {
      totalDeposits: cashDetails[0],
      totalWithdrawals: cashDetails[1],
    }
  })

}



let investorDetails = async (id) => {
  let paidBackCapital = await transactionTypeTotal(id, 'debit', ['CAPITAL'])
  let interestReceived = await transactionTypeTotal(id, 'debit', ['INTEREST'])
  let totalInvestments = await transactionTypeTotal(id, 'credit', ['INVESTMENT'])
  let totalCosts = await transactionTypeTotal(id, 'credit', ['COST'])
  let feeExpenses = await transactionTypeTotal(id, 'credit', ['FEE'])
  let feeIncome = await transactionTypeTotal(id, 'debit', ['FEE'])
  let totalDeposits = await transactionTypeTotal(id, 'debit', ['DEPOSIT'])
  let divestments = await transactionTypeTotal(id, 'debit', ['DIVESTMENT'])
  let totalWithdrawals = await transactionTypeTotal(id, 'credit', ['WITHDRAWAL'])
  let cashAvailable = await cashAvailableInvestor(id)
  let cashAccounts = await cashAccountTotals(id)


  return Promise.all([
    paidBackCapital,
    interestReceived,
    totalInvestments,
    totalCosts,
    feeExpenses,
    feeIncome,
    totalDeposits,
    totalWithdrawals,
    cashAvailable,
    cashAccounts,
    divestments
  ]).then(calc => {
    return {
      paidBackCapital: calc[0],
      interestReceived: calc[1],
      totalInvestments: calc[2],
      totalCosts: calc[3],
      feeExpenses: calc[4],
      feeIncome: calc[5],
      totalDeposits: calc[6],
      totalWithdrawals: calc[7],
      cashAvailable: calc[8],
      cashAccounts: calc[9],
      divestments: calc[10]
    }
  })
}

const investorInvestmentsDetails = async (id) => {
  return await Transaction.aggregate([{
    '$match': {
      '_investor': new ObjectID(id)
    }
  }, {
    '$lookup': {
      'from': 'loans',
      'localField': '_loan',
      'foreignField': '_id',
      'as': 'loan'
    }
  }, {
    '$unwind': {
      'path': '$loan'
    }
  }, {
    '$sort': {
      'loan.startDate': 1
    }
  }, {
    '$lookup': {
      'from': 'users',
      'localField': 'loan._borrower',
      'foreignField': '_id',
      'as': 'borrower'
    }
  }, {
    '$unwind': {
      'path': '$borrower'
    }
  }, {
    '$group': {
      '_id': {
        '_loan': '$_loan'
      },
      'investment': {
        '$sum': {
          '$cond': [{
            '$eq': [
              '$concept', 'INVESTMENT'
            ]
          }, '$credit', 0]
        }
      },
      'divestment': {
        '$sum': {
          '$cond': [{
            '$eq': [
              '$concept', 'DIVESTMENT'
            ]
          }, '$debit', 0]
        }
      },
      'capital': {
        '$sum': {
          '$cond': [{
            '$eq': [
              '$concept', 'CAPITAL'
            ]
          }, '$debit', 0]
        }
      },
      'interest': {
        '$sum': {
          '$cond': [{
            '$eq': [
              '$concept', 'INTEREST'
            ]
          }, '$debit', 0]
        }
      },
      'feeExpense': {
        '$sum': {
          '$cond': [{
            '$in': ['$concept', ['FEE', 'MANAGEMENT_INTEREST_COST', 'MANAGEMENT_FEE_COST']]
          }, '$credit', 0]
        }
      },
      'feeIncome': {
        '$sum': {
          '$cond': [{
            '$in': ['$concept', ['FEE', 'MANAGEMENT_INTEREST_INCOME', 'MANAGEMENT_FEE_INCOME']]
          }, '$debit', 0]
        }
      },
      'firstName': {
        '$first': '$borrower.firstName'
      },
      'lastName': {
        '$first': '$borrower.lastName'
      },
      'amount': {
        '$first': '$loan.capital'
      }
    }
  }, {
    '$project': {
      '_id': 0,
      'loan': '$_id._loan',
      'amount': 1,
      'name': {
        '$concat': [
          '$firstName', ' ', '$lastName'
        ]
      },
      'feeIncome': 1,
      'feeExpense': 1,
      'interest': 1,
      'capital': 1,
      'investment': 1,
      'ownership': {
        '$divide': [{
          '$subtract': [
            '$investment', '$divestment'
          ]
        }, '$amount']
      }
    }
  }])
}

let investorInvestmentsSummary = async (id) => {
  return await Investment.aggregate([{
    '$match': {
      '_investor': new ObjectID(id)
    }
  }, {
    '$group': {
      '_id': {
        '_loan': '$_loan'
      },
      '_investor': {
        '$first': '$_investor'
      },
      '_loan': {
        '$first': '$_loan'
      },
      'amount': {
        '$sum': '$amount'
      },
      'pct': {
        '$sum': '$pct'
      }
    }
  }, {
    '$lookup': {
      'from': 'transactions',
      'let': {
        'loan': '$_loan',
        'investor': '$_investor'
      },
      'pipeline': [{
        '$match': {
          '$expr': {
            '$and': [{
              '$eq': [
                '$_loan', '$$loan'
              ]
            }, {
              '$eq': [
                '$_investor', '$$investor'
              ]
            }]
          }
        }
      }],
      'as': 'transaction'
    }
  }, {
    '$project': {
      '_id': 0,
      '_loan': '$_id._loan',
      'pct': 1,
      'investment': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'INVESTMENT'
                  ]
                }, '$$this.credit', 0]
              }
            ]
          }
        }
      },
      'divestment': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'DIVESTMENT'
                  ]
                }, '$$this.debit', 0]
              }
            ]
          }
        }
      },
      'interest': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'INTEREST'
                  ]
                }, '$$this.debit', 0]
              }
            ]
          }
        }
      },
      'capital': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'CAPITAL'
                  ]
                }, '$$this.debit', 0]
              }
            ]
          }
        }
      },
      'feeExpenses': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'FEE'
                  ]
                }, '$$this.credit', 0]
              }
            ]
          }
        }
      },
      'feeIncome': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'FEE'
                  ]
                }, '$$this.debit', 0]
              }
            ]
          }
        }
      },
      'managementFeeExpense': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'MANAGEMENT_FEE_COST'
                  ]
                }, '$$this.credit', 0]
              }
            ]
          }
        }
      },
      'managementFeeIncome': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'MANAGEMENT_FEE_INCOME'
                  ]
                }, '$$this.debit', 0]
              }
            ]
          }
        }
      },
      'managementInterestExpense': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'MANAGEMENT_INTEREST_COST'
                  ]
                }, '$$this.credit', 0]
              }
            ]
          }
        }
      },
      'managementInterestIncome': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'MANAGEMENT_INTEREST_INCOME'
                  ]
                }, '$$this.debit', 0]
              }
            ]
          }
        }
      },
      'commissionIncome': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'COMMISION_INCOME'
                  ]
                }, '$$this.debit', 0]
              }
            ]
          }
        }
      },
      'commissionExpense': {
        '$reduce': {
          'input': '$transaction',
          'initialValue': 0,
          'in': {
            '$sum': [
              '$$value', {
                '$cond': [{
                  '$eq': [
                    '$$this.concept', 'COMMISION_COST'
                  ]
                }, '$$this.credit', 0]
              }
            ]
          }
        }
      }
    }
  }, {
    '$lookup': {
      'from': 'loans',
      'localField': '_loan',
      'foreignField': '_id',
      'as': 'loan'
    }
  }, {
    '$unwind': {
      'path': '$loan'
    }
  }, {
    '$project': {
      '_loan': 1,
      '_investor': 1,
      'pct': 1,
      'borrower': '$loan._borrower',
      'status': '$loan.status',
      'startDate': '$loan.startDate',
      'investment': 1,
      'divestment': 1,
      'capital': 1,
      'interest': 1,
      'feeExpenses': 1,
      'feeIncome': 1,
      'managementFeeExpense': 1,
      'managementFeeIncome': 1,
      'commissionIncome': 1,
      'commissionExpense': 1
    }
  }, {
    '$lookup': {
      'from': 'users',
      'localField': 'borrower',
      'foreignField': '_id',
      'as': 'borrower'
    }
  }, {
    '$unwind': {
      'path': '$borrower'
    }
  }, {
    '$project': {
      '_loan': 1,
      '_investor': 1,
      'pct': 1,
      'firstName': '$borrower.firstName',
      'lastName': '$borrower.lastName',
      'status': 1,
      'startDate': 1,
      'investment': 1,
      'divestment': 1,
      'capital': 1,
      'interest': 1,
      'feeExpenses': 1,
      'feeIncome': 1,
      'managementFeeExpense': 1,
      'managementFeeIncome': 1,
      'commissionIncome': 1,
      'commissionExpense': 1
    }
  }, {
    '$sort': {
      'status': -1
    }
  }])
}

module.exports = {
  conceptAggregates,
  accountTotalsByLocation,
  calculateTotalCashAvailable,
  calculateAccountPcts,
  investmentDistributor,
  transactionTypeTotal,
  cashAvailableInvestor,
  investorTransactions,
  cashAccountTotals,
  cashAvailabilityValidator,
  investorDetails,
  investorTxBook,
  investorInvestmentsDetails,
  investorCashDetails,
  investorInvestmentDetails,
  investorPLDetails,
  investorCashMovements,
  investorInvestmentsSummary
}