const statusUpdater = async (loan) => {
  let {
    loanSchedule
  } = loan

  totalPaid = await cashSourceReducer(loanSchedule, 'principal_pmt')
  interestEarned = await cashSourceReducer(loanSchedule, 'interest_pmt')
  status = await statusValidator(totalPaid, loan.capital)
  paidback = totalPaid + interestEarned >= loan.capital ? true : false;

  return {
    totalPaid: totalPaid,
    interestEarned: interestEarned,
    status: status,
    capitalRemaining: loan.capital - totalPaid,
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

const loanScheduleUpdater = (amountPaid, loanSchedule) => {

  let {
    principal,
    interest,
    status
  } = loanSchedule

  let initialBalance = principal + interest

  if (amountPaid >= initialBalance) {
    principal_pmt = principal
    interest_pmt = amountPaid - principal
    balanceDue = 0
    status = "PAID"
  } else if (amountPaid <= initialBalance) {
    if (amountPaid < principal) {
      principal_pmt = amountPaid
      interest_pmt = 0
    } else if (amountPaid >= principal) {
      principal_pmt = principal
      interest_pmt = amountPaid - principal
    }
    balanceDue = initialBalance - amountPaid
  }

  return {
    status,
    principal_pmt,
    interest_pmt,
    balanceDue
  }
}


const intAndCapCalc = (loanSchedule, paymentAmount) => {

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