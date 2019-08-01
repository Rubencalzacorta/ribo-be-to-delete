const moment = require('moment')
const round = require('mongo-round')

portfolioAggregates = () => {
  let startDate = new Date()
  let endDate = new Date()
  startDate = startDate.setMonth(startDate.getMonth() - 5)
  endDate = endDate.setMonth(endDate.getMonth() + 1)

  return [{
    '$match': {
      'status': {
        '$ne': 'CLOSED'
      }
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
      'InterestActualIncome': {
        '$sum': {
          '$cond': [{
            '$gt': [
              'interest_pmt', 0
            ]
          }, '$interest_pmt', 0]
        }
      },
      'PrincipalActualRepayment': {
        '$sum': {
          '$cond': [{
            '$gt': [
              'principal_pmt', 0
            ]
          }, '$principal_pmt', 0]
        }
      },
      'PrincipalProjectedRepayment': {
        '$sum': {
          '$cond': [{
            '$gt': [
              'principal', 0
            ]
          }, '$principal', 0]
        }
      },
      'InterestProjectedIncome': {
        '$sum': {
          '$cond': [{
            '$gt': [
              'interest', 0
            ]
          }, '$interest', 0]
        }
      },
      'PrincipalProjectedOutstanding': {
        '$sum': '$balance'
      }
    }
  }, {
    '$project': {
      '_id': 0,
      'date': {
        '$dateFromParts': {
          'year': '$_id.year',
          'month': '$_id.month'
        }
      },
      'InterestProjectedIncome': round('$InterestProjectedIncome', 2),
      'InterestActualIncome': round('$InterestActualIncome', 2),
      'PrincipalActualRepayment': round('$PrincipalActualRepayment', 2),
      'PrincipalProjectedRepayment': round('$PrincipalProjectedRepayment', 2),
      'PrincipalProjectedOutstanding': round('$PrincipalProjectedOutstanding', 2)
    }
  }, {
    '$match': {
      'date': {
        '$lte': new Date(endDate),
        '$gte': new Date(startDate)
      },
    }
  }, {
    '$sort': {
      'date': 1
    }
  }]
}

module.exports = {
  portfolioAggregates
}