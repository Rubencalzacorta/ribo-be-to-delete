

const LoanSchedule = require("../../models/LoanSchedule")
const Loan = require("../../models/Loan")


const LoanTotals = () => {
    return Loan.aggregate([
      {
        '$match': {
          'status': 'open'
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
          '_id': 'global', 
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
          'status': 'open'
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
    CountryLoanTotals
}