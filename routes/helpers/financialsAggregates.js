 var round = require('mongo-round');

 const countryCashFlow = (country) => {

     let dt = new Date()
     let startDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
     let endDate = new Date(dt.getFullYear(), dt.getMonth() + 12, 1);


     return [{
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
             'date': 1,
             'interest': 1,
             'principal': 1,
             'currency': 1,
             '_borrower': '$loan._borrower'
         }
     }, {
         '$lookup': {
             'from': 'users',
             'localField': '_borrower',
             'foreignField': '_id',
             'as': 'borrower'
         }
     }, {
         '$unwind': {
             'path': '$borrower'
         }
     }, {
         '$project': {
             'date': 1,
             'interest': 1,
             'principal': 1,
             'currency': 1,
             'country': '$borrower.country'
         }
     }, {
         '$match': {
             'country': country,
             'date': {
                 '$gte': startDate,
                 '$lt': endDate
             }
         }
     }, {
         '$group': {
             '_id': {
                 'country': '$country',
                 'currency': '$currency',
                 'week': {
                     '$week': '$week'
                 },
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
             'month': '$_id.month',
             'year': '$_id.year',
             'country': '$_id.country',
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
     }]
 }

 module.exports = {
     countryCashFlow,
     cashAvailable
 }