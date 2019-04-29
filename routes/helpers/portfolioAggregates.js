portfolioAggregates = () => {
    return [
        {
        '$match': {
            'status': {
                '$ne': 'CLOSED'
            }
        }
        },{
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
                '$cond': [
                  {
                    '$gt': [
                      'interest_pmt', 0
                    ]
                  }, '$interest_pmt', 0
                ]
              }
            }, 
            'PrincipalActualRepayment': {
              '$sum': {
                '$cond': [
                  {
                    '$gt': [
                      'principal_pmt', 0
                    ]
                  }, '$principal_pmt', 0
                ]
              }
            }, 
            'PrincipalProjectedRepayment': {
              '$sum': {
                '$cond': [
                  {
                    '$gt': [
                      'principal', 0
                    ]
                  }, '$principal', 0
                ]
              }
            }, 
            'InterestProjectedIncome': {
              '$sum': {
                '$cond': [
                  {
                    '$gt': [
                      'interest', 0
                    ]
                  }, '$interest', 0
                ]
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
            'InterestProjectedIncome': 1, 
            'InterestActualIncome': 1, 
            'PrincipalActualRepayment': 1, 
            'PrincipalProjectedRepayment': 1, 
            'PrincipalProjectedOutstanding': 1
          }
        }, {
          '$sort': {
            'date': 1
          }
        }
      ]}

  module.exports = {
      portfolioAggregates
  }