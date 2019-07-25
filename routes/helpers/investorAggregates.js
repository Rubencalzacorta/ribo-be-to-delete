const mongoose = require('mongoose')
const Transaction = require('../../models/Transaction')

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
      'fullName': 1
    }
  }, {
    '$match': {
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



module.exports = {
  conceptAggregates,
  accountTotalsByLocation,
  calculateTotalCashAvailable,
  calculateAccountPcts,
  investmentDistributor
}