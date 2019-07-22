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

module.exports = {
  conceptAggregates
}