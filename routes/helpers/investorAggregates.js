const mongoose = require('mongoose')
const Transaction = require('../../models/Transaction')
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
  return [{
    '$project': {
      '_investor': 1,
      'cashAccount': 1,
      'debit': {
        '$divide': [{
            '$subtract': [{
                '$multiply': ['$debit', 100]
              },
              {
                '$mod': [{
                  '$multiply': ['$debit', 100]
                }, 1]
              }
            ]
          },
          100
        ]
      },
      'credit': {
        '$divide': [{
            '$subtract': [{
                '$multiply': ['$credit', 100]
              },
              {
                '$mod': [{
                  '$multiply': ['$credit', 100]
                }, 1]
              }
            ]
          },
          100
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
  }]
}


calculateTotalCashAvailable = (accTotals) => {
  return accTotals.reduce((acc, e) => {
    return acc + e.total
  }, 0)
}

calculateAccountPcts = (accs, totalCash) => {
  let accounts = accs.map(e => {
    return {
      ...e,
      pct: (e.total / totalCash)
    }
  })
  return accounts
}

generateInvestments = (loanAmount, loanId, currency, investors) => {
  let investments = []

  investors.forEach(e => {
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

investmentDistributor = async (Model, location, loanAmount, loanId, currency) => {
  let accounts = await Model.aggregate(accountTotalsByLocation(location))
  let totalCashAvailable = await calculateTotalCashAvailable(accounts)
  let investors = await calculateAccountPcts(accounts, totalCashAvailable)
  let investments = await generateInvestments(loanAmount, loanId, currency, investors)

  return investments

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

const investorTransactions = async (id) => {
  return Transaction.find({
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
  let totalCosts = await transactionTypeTotal(id, 'credit', ['COST'])
  let feeExpenses = await transactionTypeTotal(id, 'credit', ['FEE', 'MANAGEMENT_INTEREST', 'MANAGEMENT_FEE', 'COMMISSION'])
  let feeIncome = await transactionTypeTotal(id, 'debit', ['FEE', 'MANAGEMENT_INTEREST', 'MANAGEMENT_FEE', 'COMMISSION'])

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
  let totalDeposits = await transactionTypeTotal(id, 'debit', ['DEPOSIT'])
  let totalWithdrawals = await transactionTypeTotal(id, 'credit', ['WITHDRAWAL'])

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
            '$eq': [
              '$concept', 'FEE'
            ]
          }, '$credit', 0]
        }
      },
      'feeIncome': {
        '$sum': {
          '$cond': [{
            '$eq': [
              '$concept', 'FEE'
            ]
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

let investorInvestmentsSummary = (id) => {
  return Investor.aggregate([{
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
                    '$$this.concept', 'MANAGEMENT_FEE'
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
                    '$$this.concept', 'MANAGEMENT_FEE'
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
                    '$$this.concept', 'MANAGEMENT_INTEREST'
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
                    '$$this.concept', 'MANAGEMENT_INTEREST'
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
                    '$$this.concept', 'COMMISION'
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
                    '$$this.concept', 'COMMISION'
                  ]
                }, '$$this.credit', 0]
              }
            ]
          }
        }
      }
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
  investorDetails,
  investorInvestmentsDetails,
  investorCashDetails,
  investorInvestmentDetails,
  investorPLDetails,
  investorCashMovements,
  investorInvestmentsSummary
}