const LoanSchedule = require('../LoanSchedule')
const moment = require('moment')

const statusUpdater = async (loan) => {
  let {
    loanSchedule,
    capital
  } = loan

  totalPaid = await cashSourceReducer(loanSchedule, 'principal_pmt')
  interestEarned = await cashSourceReducer(loanSchedule, 'interest_pmt')
  previousStatus = loan.status
  newStatus = await statusValidator(totalPaid, capital)
  paidback = totalPaid + interestEarned >= capital ? true : false;

  if (previousStatus === 'OPEN' && newStatus === 'CLOSED') {
    scheduleUpdaterOnCloseLoan(loan)
  } else if (previousStatus === 'CLOSED' && newStatus === 'OPEN') {
    scheduleUpdaterOnReOpenLoan(loan)
  }


  return {
    totalPaid: totalPaid,
    interestEarned: interestEarned,
    status: newStatus,
    capitalRemaining: capital - totalPaid,
    paidback: paidback
  }
}

let cashSourceReducer = async (loanSchedule, cashSource) => {
  return loanSchedule.reduce((acc, e) => {
    if (e[cashSource] === undefined) {
      pmt = 0
    } else {
      pmt = e[cashSource]
    }
    return acc + pmt
  }, 0)

}

let statusValidator = async (totalPaid, capital) => {
  let status = "OPEN"

  if (totalPaid >= capital) {
    status = "CLOSED";
  } else if (capital - totalPaid < 1) {
    status = "CLOSED"
  }

  return status

}

let scheduleUpdaterOnCloseLoan = async (loan) => {
  const LoanSchedule = require('../LoanSchedule')
  let uncloseableStatus = ['DISBURSTMENT', 'DUE', 'OVERDUE', 'PAID', 'OUTSTANDING']
  console.log(LoanSchedule)
  await LoanSchedule.updateMany({
    _loan: loan._id,
    status: {
      $nin: uncloseableStatus
    }
  }, {
    status: 'CLOSED'
  })
  await LoanSchedule.updateMany({
    _loan: loan._id,
    status: 'DUE'
  }, {
    status: 'UNPAID_DUE'
  })
  await LoanSchedule.updateMany({
    _loan: loan._id,
    status: 'OVERDUE'
  }, {
    status: 'UNPAID_OVERDUE'
  })
}

let scheduleUpdaterOnReOpenLoan = async (loan) => {
  const LoanSchedule = require('../LoanSchedule')
  let closedStatus = ['CLOSED', 'UNPAID_DUE', 'UNPAID_OVERDUE']

  console.log(LoanSchedule)
  await LoanSchedule.updateMany({
    _loan: loan._id,
    status: {
      $in: closedStatus
    },
    date: {
      $gt: moment().add(30, 'd').format('YYYY-MM-DD')
    }
  }, {
    status: 'PENDING'
  })
  await LoanSchedule.updateMany({
    _loan: loan._id,
    status: {
      $in: closedStatus
    },
    date: {
      $lt: moment().add(30, 'd'),
      $gte: moment().subtract(7, 'd')
    }
  }, {
    status: 'DUE'
  })
  await LoanSchedule.updateMany({
    _loan: loan._id,
    status: {
      $in: closedStatus
    },
    date: {
      $lte: moment().subtract(7, 'd').format('YYYY-MM-DD'),
    }
  }, {
    status: 'OVERDUE'
  })
}

const loanScheduleUpdater = (amountPaid, loanSchedule, paymentType, capitalRemaining) => {

  let {
    principal,
    interest,
    status,
    date
  } = loanSchedule

  let initialBalance = principal + interest

  if (paymentType === 'REGULAR') {

    if (amountPaid >= initialBalance - 0.5) {
      principal_pmt = principal
      interest_pmt = amountPaid - principal
      balanceDue = 0
      status = "PAID"
    } else if (amountPaid <= initialBalance) {
      if (amountPaid < principal) {
        principal_pmt = amountPaid
        interest_pmt = 0
        // status = "OUTSTANDING"
      } else if (amountPaid >= principal) {
        principal_pmt = principal
        interest_pmt = amountPaid - principal
      }
      // status = statusSetter(date)
      status = "OUTSTANDING"
      balanceDue = initialBalance - amountPaid
    }
  } else if (paymentType === 'FULL') {
    principal_pmt = capitalRemaining
    interest_pmt = amountPaid - capitalRemaining
    balanceDue = 0
    status = "PAID"
  }


  if (amountPaid === 0) {
    status = statusSetter(date)
  }


  return {
    status,
    principal_pmt,
    interest_pmt,
    balanceDue,
  }
}

const statusSetter = (date) => {
  todayDate = new Date()
  console.log(dateDiff(todayDate, date))
  if (date > todayDate) {
    return 'PENDING'
  } else if (dateDiff(todayDate, date) >= 7) {
    return 'OVERDUE'
  } else if (dateDiff(todayDate, date) < 30 && dateDiff(todayDate, date) > 0) {
    return 'DUE'
  }
}

const dateDiff = (date1, date2) => {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const intAndCapCalc = (loanSchedule, paymentAmount, paymentType, loanCapitalRemaining) => {

  let {
    interest_pmt,
    principal_pmt,
    interest,
    principal
  } = loanSchedule

  let interestPayment;
  let principalPayment;

  capitalRemaining = principal - principal_pmt
  interestRemaining = interest - interest_pmt
  totalRemaining = capitalRemaining + interestRemaining

  if (paymentType === 'FULL') {
    principalPayment = loanCapitalRemaining
    interestPayment = paymentAmount - loanCapitalRemaining
  } else {
    if (paymentAmount >= capitalRemaining) {
      principalPayment = capitalRemaining
      interestPayment = paymentAmount - capitalRemaining
    } else if (paymentAmount >= totalRemaining) {
      principalPayment = capitalRemaining
      interestPayment = paymentAmount - capitalRemaining
    } else if (paymentAmount < capitalRemaining) {
      principalPayment = paymentAmount
      interestPayment = 0
    } else if (capitalRemaining === 0) {
      interestPayment = paymentAmount
    }
  }


  return {
    principalPayment,
    interestPayment
  }
}

module.exports = {
  statusUpdater,
  loanScheduleUpdater,
  intAndCapCalc
}