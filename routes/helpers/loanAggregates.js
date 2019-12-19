const mongoose = require('mongoose')
const LoanSchedule = require('../../models/LoanSchedule')
const Investment = require('../../models/Investment')
const User = require('../../models/User')
const Loan = require('../../models/Loan')
const Transaction = require('../../models/Transaction')


const createLoanAutoInvest = async (loanInitDetails, loanDetails, country, _borrower, currency, useOfFunds, insurancePremium, next) => {
  try {
    return Loan.create({
        ...loanInitDetails,
        ...loanDetails
      })
      .then(async obj => {
        let loanId = obj._id
        let investments = await investmentDistributor(country, loanDetails.investedCapital, loanId, currency)
        let isInsured = await withInsurance(useOfFunds)
        if (isInsured) {
          await insurancePremiumRecorder(loanId, insurancePremium, loanDetails, currency, country, next)
        }
        let schedule = await loanSelector(loanId, loanDetails, currency)
        await scheduleRecorder(schedule, loanId, next)
        await borrowerLoanRecorder(_borrower, loanId, next)
        await investmentsRecorder(investments, loanId, next)
        await transactionLoanRecorder(investments, loanDetails, currency, next)
        return obj
      })
  } catch (e) {
    next(e)
  }
}

const loansTotalRemaining = (status) => {
  return [{
    '$match': {
      'status': `${status}`
    }
  }, {
    '$group': {
      '_id': 'totals',
      'totalRemaining': {
        '$sum': '$capitalRemaining'
      }
    }
  }]
}
const loansTotalPaid = (status) => {
  return [{
    '$match': {
      'status': `${status}`
    }
  }, {
    '$group': {
      '_id': 'totals',
      'totalPaid': {
        '$sum': '$totalPaid'
      },
    }
  }]
}

const loansTotalNominal = (status) => {
  return [{
    '$match': {
      'status': `${status}`
    }
  }, {
    '$group': {
      '_id': 'totals',
      'totalNominal': {
        '$sum': '$capital'
      }
    }
  }]
}

const loansTotalCollateral = (status) => {
  return [{
    '$match': {
      'status': `${status}`
    }
  }, {
    '$group': {
      '_id': 'totals',
      'totalCollateral': {
        '$sum': '$collateralValue'
      }
    }
  }]
}

const scheduleRecorder = async (schedule, loanId, next) => {
  try {
    schedule.forEach(e => {
      LoanSchedule.create(e)
        .then((schedule_t) => {
          Loan.findByIdAndUpdate(loanId, {
            $push: {
              loanSchedule: schedule_t._id
            }
          }, {
            safe: true,
            upsert: true
          }).exec()
        })
    })
  } catch (e) {
    next(e)
  }
}

const investmentsRecorder = async (investments, loanId, next) => {
  try {
    investments.forEach(e => {
      Investment.create(e)
        .then((investment_x) => {
          User.findByIdAndUpdate(e._investor, {
            $push: {
              investments: investment_x._id
            }
          }, {
            safe: true,
            upsert: true
          }).exec()
          return investment_x
        })
        .then((investment_x) => {

          Loan.findByIdAndUpdate(loanId, {
            $push: {
              investors: investment_x._id
            }
          }, {
            safe: true,
            upsert: true
          }).exec()
        })
    })
  } catch {
    next(e)
  }
}

const borrowerLoanRecorder = async (_borrower, loanId, next) => {
  try {
    User.findByIdAndUpdate(_borrower, {
      $push: {
        loans: loanId
      }
    }, {
      safe: true,
      upsert: true
    }).exec()

  } catch (e) {
    next(e)
  }
}

const transactionLoanRecorder = async (investments, loanDetails, currency, next) => {
  try {
    pendingTransactions = []
    investments.forEach(e => {
      let credit = e.amount
      let transaction = {
        _loan: e._loan,
        _investor: mongoose.Types.ObjectId(e._investor),
        date: loanDetails.startDate,
        cashAccount: e.cashAccount,
        concept: 'INVESTMENT',
        credit: credit,
        currency: currency
      }
      pendingTransactions.push(transaction)
    })
    await Transaction.insertMany(pendingTransactions)
  } catch (e) {
    next(e)
  }

}


const insurancePremiumRecorder = async (loanId, insurancePremium, loanDetails, currency, country, next) => {

  try {
    let account = await insuranceAccount(country)

    pendingTransactions = []
    let transaction = {
      _loan: loanId,
      _investor: mongoose.Types.ObjectId(account._id),
      date: loanDetails.startDate,
      cashAccount: 'RBPERU',
      concept: 'INSURANCE_PREMIUM',
      debit: insurancePremium,
      currency: currency
    }
    pendingTransactions.push(transaction)
    await Transaction.insertMany(pendingTransactions)
  } catch (e) {
    next(e)
  }
}


const loanScheduleTotalsByStatus = (status) => {
  return [{
    '$match': {
      'status': `${status}`
    }
  }, {
    '$group': {
      '_id': `${status} PAYMENTS`,
      'totalPayment': {
        '$sum': '$payment'
      },
      'totalInterest': {
        '$sum': '$interest'
      },
      'totalCapital': {
        '$sum': '$principal'
      },
      'totalQuantity': {
        '$sum': 1
      }
    }
  }]
}

const adminAccount = async (country) => {
  return await User.findOne({
    firstName: 'Ribo Capital',
    location: country
  }).select('_id')
}

const insuranceAccount = async (country) => {
  return await User.findOne({
    firstName: 'Ribo Prima',
    location: country
  }).select('_id')
}

module.exports = {
  loansTotalRemaining,
  loansTotalPaid,
  loansTotalNominal,
  loansTotalCollateral,
  loanScheduleTotalsByStatus,
  createLoanAutoInvest,
  scheduleRecorder,
  investmentsRecorder,
  borrowerLoanRecorder,
  insurancePremiumRecorder,
  transactionLoanRecorder,
  adminAccount,
  insuranceAccount
}