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

const loanScheduleUpdater = (amountPaid, loanSchedule, paymentType, capitalRemaining) => {

  let {
    principal,
    interest,
    status,
    date
  } = loanSchedule
  console.log('entra', capitalRemaining)
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

  if (date > todayDate) {
    return 'PENDING'
  } else if (dateDiff(todayDate, date) >= 7) {
    return 'OVERDUE'
  } else if (dateDiff(todayDate, date) < 7 && dateDiff(todayDate, date) > 0) {
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

  console.log({
    principalPayment: principalPayment,
    interestPayment: interestPayment
  })

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