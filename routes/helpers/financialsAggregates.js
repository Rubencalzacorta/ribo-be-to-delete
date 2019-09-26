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
             'status': 1,
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
             'status': 1,
             'country': '$borrower.country'
         }
     }, {
         '$match': {
             'status': {
                 '$in': ['PENDING', 'DUE', 'OVERDUE', 'PAID', 'OUTSTANDING']
             },
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

 countryAllocation = (countries) => {
     return [{
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
             'capitalRemaining': 1,
             'totalPaid': 1,
             'capital': 1,
             'location': '$borrower.country'
         }
     }, {
         '$match': {
             'location': {
                 '$in': countries
             }
         }
     }, {
         '$match': {
             'location': {
                 '$ne': 'CLOSED'
             }
         }
     }, {
         '$group': {
             '_id': {
                 'country': '$location'
             },
             'totalPaid': {
                 '$sum': '$totalPaid'
             },
             'totalAllocated': {
                 '$sum': '$capitalRemaining'
             },
             'totalCapital': {
                 '$sum': '$capital'
             }
         }
     }, {
         '$project': {
             '_id': 0,
             'country': '$_id.country',
             'totalPaid': 1,
             'totalAllocated': 1,
             'totalCapital': 1
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

 generalStats = (countries) => {
     return [{
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
             'capitalRemaining': 1,
             'totalPaid': 1,
             'capital': 1,
             'location': '$borrower.country',
             'status': 1,
             'duration': 1,
             'interest': 1,
             'loanType': 1
         }
     }, {
         '$match': {
             'location': {
                 '$in': countries
             }
         }
     }, {
         '$match': {
             'status': {
                 '$ne': 'CLOSED'
             }
         }
     }, {
         '$group': {
             '_id': {
                 'country': '$location'
             },
             'totalAmortized': {
                 '$sum': '$totalPaid'
             },
             'totalAllocated': {
                 '$sum': '$capitalRemaining'
             },
             'totalInitialCapital': {
                 '$sum': '$capital'
             },
             'totalLoan': {
                 '$sum': 1
             },
             'maxLoanCapital': {
                 '$max': '$capital'
             },
             'minLoanCapital': {
                 '$min': '$capital'
             },
             'avgLoanCapital': {
                 '$avg': '$capital'
             },
             'avgLoanDuration': {
                 '$avg': '$duration'
             },
             'minLoanDuration': {
                 '$min': '$duration'
             },
             'maxLoanDuration': {
                 '$max': '$duration'
             },
             'maxLoanIntRate': {
                 '$max': '$interest'
             },
             'minLoanIntRate': {
                 '$min': '$interest'
             },
             'totalLinear': {
                 '$sum': {
                     '$cond': [{
                         '$eq': [
                             '$loanType', 'linear'
                         ]
                     }, 1, 0]
                 }
             },
             'totalLinearIntFirst': {
                 '$sum': {
                     '$cond': [{
                         '$eq': [
                             '$loanType', 'linearIntFirst'
                         ]
                     }, 1, 0]
                 }
             },
             'totalPayDay': {
                 '$sum': {
                     '$cond': [{
                         '$eq': [
                             '$loanType', 'payDay'
                         ]
                     }, 1, 0]
                 }
             },
             'totalWeekDay': {
                 '$sum': {
                     '$cond': [{
                         '$eq': [
                             '$loanType', 'monday'
                         ]
                     }, 1, 0]
                 }
             },
             'totalLumpSum': {
                 '$sum': {
                     '$cond': [{
                         '$eq': [
                             '$loanType', 'lumpSum'
                         ]
                     }, 1, 0]
                 }
             },
             'totalFactoring': {
                 '$sum': {
                     '$cond': [{
                         '$eq': [
                             '$loanType', 'factoring'
                         ]
                     }, 1, 0]
                 }
             }
         }
     }, {
         '$project': {
             '_id': 0,
             'country': '$_id.country',
             'totalAmortized': 1,
             'totalAllocated': 1,
             'totalInitialCapital': 1,
             'totalLoan': 1,
             'maxLoanCapital': 1,
             'minLoanCapital': 1,
             'avgLoanCapital': 1,
             'avgLoanDuration': 1,
             'minLoanDuration': 1,
             'maxLoanDuration': 1,
             'maxLoanIntRate': 1,
             'minLoanIntRate': 1,
             'totalLinear': 1,
             'totalLinearIntFirst': 1,
             'totalPayDay': 1,
             'totalWeekDay': 1,
             'totalLumpSum': 1,
             'totalFactoring': 1
         }
     }]
 }

 cashAccountMovements = (cashAccount) => {
     return [{
         '$match': {
             'cashAccount': cashAccount,
             'concept': {
                 '$nin': ['FEE', 'MANAGEMENT_FEE']
             }
         }
     }, {
         '$sort': {
             'date': -1
         }
     }, {
         '$project': {
             'debit': 1,
             'credit': 1,
             'concept': 1,
             'date_pmt': 1,
             'date': 1,
             '_loan': 1,
             '_loanSchedule': 1,
             '_investor': 1
         }
     }, {
         '$group': {
             '_id': {
                 '_loanSchedule': '$_loanSchedule',
                 '_loan': '$loan',
                 'concept': '$concept',
                 'date': '$date'
             },
             'debit': {
                 '$sum': '$debit'
             },
             'credit': {
                 '$sum': '$credit'
             },
             'date': {
                 '$first': '$date'
             },
             'date_pmt': {
                 '$first': '$date_pmt'
             },
             '_investor': {
                 '$first': '$_investor'
             },
             '_loan': {
                 '$first': '$_loan'
             },
             'concept': {
                 '$first': '$concept'
             }
         }
     }, {
         '$project': {
             '_id': 0
         }
     }]
 }

 module.exports = {
     countryCashFlow,
     cashAvailable,
     countryAllocation,
     generalStats,
     cashAccountMovements
 }