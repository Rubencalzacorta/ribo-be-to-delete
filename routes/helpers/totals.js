

const LoanSchedule = require("../../models/LoanSchedule")
const Loan = require("../../models/Loan")
const moment = require("moment")


const MonthlyLoanScheduleTotals = (currency) => {
    let c = currency
    console.log(c)
    return LoanSchedule.find({date: {$gte: moment().startOf('month'), $lte:  moment().endOf('month')}, status: {$nin: ['DISBURSTMENT', 'CLOSED']}, currency: c})
    .then( async data => {
      let totalInterestPaid = await data.reduce( (acc, e) => { return acc + e.interest_pmt},0)
      let totalPrincipalPaid = await data.reduce( (acc, e) => { return acc + e.principal_pmt},0)
      let totalInterest = await data.reduce( (acc, e) => { return acc + e.interest},0)
      let totalPrincipal = await data.reduce( (acc, e) => { return acc + e.principal},0)
      details = 
          {'_id': c,
           'details': {
          'interestPaid': totalInterestPaid, 
          'principalPaid': totalPrincipalPaid,
          'projectedInterest': totalInterest, 
          'projectedPrincipal': totalPrincipal,
          'pctInterestPaid': totalInterestPaid/totalInterest || 0,
          'pctPrincipalPaid': totalPrincipalPaid/totalPrincipal || 0
          }}
        
      return details
    })
    .catch( e => console.log(e))
}

const LoanTotals = () => {
    return Loan.aggregate([
      {
        '$match': {
          'status': 'OPEN'
        }
      }, {
        '$project': {
          'capital': 1, 
          'totalPaid': 1, 
          'duration': 1, 
          'startDate': 1, 
          'currency': 1, 
          'currentDate': new Date(), 
          'capitalRemaining': {
            '$subtract': [
              '$capital', '$totalPaid'
            ]
          }, 
          'interestRate': {
            '$divide': [
              '$interest', 100
            ]
          }
        }
      }, {
        '$project': {
          'capitalRemaining': 1, 
          'interestRate': 1, 
          'totalPaid': 1, 
          'capital': 1, 
          'duration': 1, 
          'startDate': 1, 
          'currency': 1, 
          'interest': {
            '$multiply': [
              '$interestRate', '$capital'
            ]
          }
        }
      }, {
        '$group': {
          '_id': '$currency', 
          'totalDuration': {
            '$sum': '$duration'
          }, 
          'totalActiveLoans': {
            '$sum': 1
          }, 
          'totalCapital': {
            '$sum': '$capital'
          }, 
          'totalPaid': {
            '$sum': '$totalPaid'
          }, 
          'totalCapitalRemaining': {
            '$sum': '$capitalRemaining'
          }, 
          'totalInterest': {
            '$sum': '$interest'
          }
        }
      }, {
        '$project': {
          'totalPaid': 1, 
          'totalCapital': 1, 
          'totalCapitalRemaining': 1, 
          'totalInterest': 1, 
          'totalActiveLoans': 1, 
          'averageDuration': {
            '$divide': [
              '$totalDuration', '$totalActiveLoans'
            ]
          }, 
          'averageIntRate': {
            '$divide': [
              '$totalInterest', '$totalCapital'
            ]
          }, 
          'averageActIntRate': {
            '$divide': [
              '$totalInterest', '$totalCapitalRemaining'
            ]
          }, 
          'averageLoan': {
            '$divide': [
              '$totalCapital', '$totalActiveLoans'
            ]
          }, 
          'averageLoanActiveCap': {
            '$divide': [
              '$totalCapitalRemaining', '$totalActiveLoans'
            ]
          }
        }
      }
    ])
}


const CountryLoanTotals = (country) => {
    return Loan.aggregate([
      {
        '$lookup': {
          'from': 'users', 
          'localField': '_borrower', 
          'foreignField': '_id', 
          'as': 'details'
        }
      }, {
        '$unwind': {
          'path': '$details'
        }
      }, {
        '$match': {
          'details.country': country, 
          'status': 'OPEN'
        }
      }, {
        '$project': {
          'capital': 1, 
          'totalPaid': 1, 
          'duration': 1, 
          'startDate': 1, 
          'currentDate': new Date(), 
          'capitalRemaining': {
            '$subtract': [
              '$capital', '$totalPaid'
            ]
          }, 
          'interestRate': {
            '$divide': [
              '$interest', 100
            ]
          }, 
          'amort': {
            '$divide': [
              '$capital', '$duration'
            ]
          }
        }
      }, {
        '$project': {
          'capitalRemaining': 1, 
          'interestRate': 1, 
          'totalPaid': 1, 
          'capital': 1, 
          'duration': 1, 
          'startDate': 1, 
          'amort': 1, 
          'interest': {
            '$multiply': [
              '$interestRate', '$capital'
            ]
          }
        }
      }, {
        '$group': {
          '_id': country, 
          'totalDuration': {
            '$sum': '$duration'
          }, 
          'totalActiveLoans': {
            '$sum': 1
          }, 
          'totalCapital': {
            '$sum': '$capital'
          }, 
          'totalPaid': {
            '$sum': '$totalPaid'
          }, 
          'totalCapitalRemaining': {
            '$sum': '$capitalRemaining'
          }, 
          'totalAmort': {
            '$sum': '$amort'
          }, 
          'totalInterest': {
            '$sum': '$interest'
          }
        }
      }, {
        '$project': {
          'totalPaid': 1, 
          'totalCapital': 1, 
          'totalCapitalRemaining': 1, 
          'totalInterest': 1, 
          'totalActiveLoans': 1, 
          'totalAmort': 1, 
          'averageDuration': {
            '$divide': [
              '$totalDuration', '$totalActiveLoans'
            ]
          }, 
          'averageIntRate': {
            '$divide': [
              '$totalInterest', '$totalCapital'
            ]
          }, 
          'averageActIntRate': {
            '$divide': [
              '$totalInterest', '$totalCapitalRemaining'
            ]
          }, 
          'averageLoan': {
            '$divide': [
              '$totalCapital', '$totalActiveLoans'
            ]
          }, 
          'averageLoanActiveCap': {
            '$divide': [
              '$totalCapitalRemaining', '$totalActiveLoans'
            ]
          }
        }
      }
    ])
}

module.exports = {
    LoanTotals,
    CountryLoanTotals,
    MonthlyLoanScheduleTotals
}