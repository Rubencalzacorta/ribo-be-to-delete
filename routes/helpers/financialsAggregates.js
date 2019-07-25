 var round = require('mongo-round');

 const currencyCashFlow = (currency, date) => {

     let dt = new Date(date)
     let startDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
     let endDate = new Date(dt.getFullYear(), dt.getMonth() + 12, 1);


     return [{
         '$match': {
             'currency': currency,
             'date': {
                 '$gte': startDate,
                 '$lte': endDate
             }
         }
     }, {
         '$group': {
             '_id': {
                 //  'week': {
                 //      '$week': '$date'
                 //  },
                 'month': {
                     '$month': '$date'
                 },
                 'year': {
                     '$year': '$date'
                 }
             },
             'interest': {
                 '$sum': '$interest'
             },
             'principal': {
                 '$sum': '$principal'
             },
             'payment': {
                 '$sum': '$payment'
             },
             'currency': {
                 '$first': '$currency'
             }
         }
     }, {
         '$project': {
             '_id': 0,
             //  'week': '$_id.week',
             'month': '$_id.month',
             'year': '$_id.year',
             'interest': 1,
             'principal': 1,
             'payment': 1,
             'currency': 1
         }
     }, {
         '$sort': {
             'year': 1,
             'month': 1,
             'currency': 1
         }
     }]
 }

 const cashAvailable = (cashAccounts) => {
     accounts = cashAccounts.map((e) => {
         return {
             'cashAccount': e
         }
     })

     return [{
         '$match': {
             '$or': accounts
         }
     }, {
    '$project': {
      'cashAccount': 1, 
      'diff': {
        '$subtract': [
          '$debit', '$credit'
        ]
      }
    }
  }, {
    '$group': {
      '_id': {
        'cashAccount': '$cashAccount'
      }, 
      'total': {
        '$sum': '$diff'
      }
    }
  }, {
    '$project': {
      '_id': 0, 
      'cashAccount': '$_id.cashAccount', 
      'total': 1
    }
  }
]
 }

 module.exports = {
     currencyCashFlow,
     cashAvailable
 }