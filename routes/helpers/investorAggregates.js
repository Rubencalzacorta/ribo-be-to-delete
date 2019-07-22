const mongoose = require('mongoose')

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

accountTotals = (location) => {
  return [{
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
        'account': '$cashAccount',
        'investor': '$_investor'
      },
      'total': {
        '$sum': '$dayBalance'
      }
    }
  }, {
    '$project': {
      '_id': 0,
      'account': '$_id.account',
      'investor': '$_id.investor',
      'total': 1
    }
  }, {
    '$lookup': {
      'from': 'users',
      'localField': 'investor',
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
      'account': 1,
      'investor': 1,
      'location': '$investord.location',
      'fullName': 1
    }
  }, {
    '$match': {
      'location': location
    }
  }]
}


module.exports = {
  conceptAggregates,
  accountTotals
}