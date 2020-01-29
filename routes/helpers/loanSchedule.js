const moment = require('moment')

rounder = (numberToRound) => {
  try {
    return Math.round(numberToRound * 10000) / 10000
  } catch (e) {
    return e
  }
}

const paymentDate = (inputDate, pl, p, period) => {
  if (period != 'payDay') {
    date = moment(inputDate).add(pl, p).format('YYYY-MM-DD')
  } else {
    if (moment(inputDate).add(pl, p).date() < 16) {
      date = moment(inputDate).add(pl, p).set({
        date: 15 + 1
      }).format('YYYY-MM-DD')

    } else {
      let lastDay = moment(inputDate).add(pl, p).endOf('month').date()
      date = moment(inputDate).add(pl, p).set({
        date: lastDay + 1
      }).format('YYYY-MM-DD')
    }
  }
  return date
}


interestRatesTransformer = (interest) => {
  interest = interest / 100
  return {
    'yearly': interest * 12,
    'quarterly': interest * 3,
    'biMonthly': interest * 2,
    'monthly': interest,
    'biWeekly': ((interest * 12) / 360) * 14,
    'payDay': ((interest * 12) / 360) * 15,
    'weekly': ((interest * 12) / 360) * 7,
    'daily': ((interest * 12) / 360)
  }
}


let balance_period = (C, P, i) => {
  let periodSchedule = {}

  periodSchedule.interest = rounder(C * i)
  periodSchedule.principal = rounder(P - (C * i))
  periodSchedule.payment = rounder(P)
  periodSchedule.balance = rounder(C - periodSchedule.principal)

  return periodSchedule

}

const period = (period) => {
  if (period == 'yearly') {
    return 'years'
  } else if (period == 'quarterly') {
    return 'quaters'
  } else if (period == 'monthly') {
    return 'month'
  } else if (period == 'biWeekly') {
    return 'weeks'
  } else if (period == 'payDay') {
    return 'weeks'
  } else if (period == 'weekly') {
    return 'weeks'
  }
}

const periodLength = (period) => {
  if (period == 'yearly') {
    return 1
  } else if (period == 'quarterly') {
    return 1
  } else if (period == 'monthly') {
    return 1
  } else if (period == 'biWeekly') {
    return 2
  } else if (period == 'payDay') {
    return 2
  } else if (period == 'weekly') {
    return 1
  }
}


amort2Loan = (loanId, amountOfPayments, periodicity, initialDate, startDate, startAmortPeriod, interest, capital, currency) => {
  schedule = []
  let p = period(periodicity)
  let pl = periodLength(periodicity)
  let int = interestRatesTransformer(interest)[periodicity]
  let amortPeriods = amountOfPayments - startAmortPeriod
  let payments = annuity(capital, int, amortPeriods)
  let initialAmort = payments - (capital * interestRatesTransformer(interest)[periodicity])

  for (i = 0; i < amountOfPayments + 1; i++) {

    let ap = i >= startAmortPeriod ? i - startAmortPeriod : 0;

    if (i == 0) {
      schedule.push({
        _loan: loanId,
        status: 'DISBURSTMENT',
        date: moment(initialDate).format('YYYY-MM-DD'),
        interest: 0,
        principal: 0,
        balance: capital,
        currency: currency
      })
    } else if (i == 1) {
      schedule.push({
        _loan: loanId,
        status: 'DUE',
        date: moment(startDate).format('YYYY-MM-DD'),
        interest: rounder((moment(startDate).diff(moment(initialDate), 'd')) * capital * interestRatesTransformer(interest)['daily']),
        principal: ap == 0 ? 0 : initialAmort,
        payment: ap == 0 ? rounder((moment(startDate).diff(moment(initialDate), 'd')) * capital * interestRatesTransformer(interest)['daily']) : (moment(startDate).diff(moment(initialDate), 'd')) * capital * interestRatesTransformer(interest)['daily'] + initialAmort,
        balance: ap == 0 ? capital : capital - initialAmort,
        currency: currency
      })
    } else {
      if (ap == 0) {
        ap = {
          interest: rounder(capital * interestRatesTransformer(interest)[periodicity]),
          principal: 0,
          payment: rounder(capital * interestRatesTransformer(interest)[periodicity]),
          balance: rounder(capital)
        }
      } else {
        ap = balance_period(schedule[schedule.length - 1].balance, payments, interestRatesTransformer(interest)[periodicity])
      }
      schedule.push({
        _loan: loanId,
        status: 'PENDING',
        currency: currency,
        date: paymentDate(schedule[schedule.length - 1].date, pl, p, periodicity),
        ...ap
      })
    }
  }
  return schedule
}

const interestPortionCalc = (date) => {
  let day = date.date()
  let lastDay = date.endOf('month').date()

  if (day > 10 && day <= 15) {
    return ((lastDay - day) * (1 / 15))
  } else if (day >= 1 && day <= 10) {
    return ((16 - day) * (1 / 15))
  } else if (day > 15 && day <= 25) {
    return ((lastDay + 1 - day) * (1 / (lastDay - 15)))
  } else if (day > 25 && day <= lastDay) {
    return ((lastDay - day + 15) * (1 / (lastDay - 15)))
  }
}

const getStartDate = (date) => {

  let day = moment(date).date()
  let year = moment(date).year()
  let month = moment(date).month()
  let lastDay = date.endOf('month').date()
  if (day > 10 && day <= 15) {
    return moment([year, month, lastDay]).format('YYYY-MM-DD')
  } else if (day >= 1 && day <= 10) {
    return moment([year, month, 15]).format('YYYY-MM-DD')
  } else if (day > 15 && day <= 25) {
    return moment([year, month, lastDay]).format('YYYY-MM-DD')
  } else if (day > 25 && day <= lastDay) {
    return moment([year, month, 15]).add(1, 'M').format('YYYY-MM-DD')
  }
}
const mondayPayDayLoan = (loan, duration, interestRate, capital, dstartDate, dpaymentDate, currency) => {
  const startDate = moment(dstartDate)
  let paymentDate = moment(dpaymentDate)
  let firstInterestPayment = (((interestRate / 100) / 30) * capital) * -startDate.diff(paymentDate, 'days')
  let amountOfPayments = duration
  let principal = capital / amountOfPayments
  let interest = ((interestRate / 100) / 30) * capital * 15


  let schedule = [{
    _loan: loan,
    date: moment(startDate).toString(),
    payment: 0,
    interest: 0,
    principal: 0,
    balance: capital,
    status: "DISBURSTMENT",
    currency: currency
  }, {
    _loan: loan,
    date: moment(paymentDate).toString(),
    payment: firstInterestPayment + principal,
    interest: firstInterestPayment,
    principal: principal,
    balance: capital - principal,
    status: "DUE",
    currency: currency
  }]

  for (i = 2; i <= amountOfPayments; i++) {
    amort_pmt = {
      _loan: loan,
      date: moment(paymentDate).add(14 * (i - 1), "days").toString(),
      payment: interest + principal,
      interest: interest,
      principal: principal,
      balance: capital - (principal * i),
      status: "PENDING",
      currency: currency
    }
    schedule.push(amort_pmt)
  }

  return schedule

}


const payDayLoan = (loan, period, duration, interestRate, capital, date, currency) => {

  const frequencyStructure = {
    'biWeekly': {
      everyOther: 0.5,
      periodicity: 'd',
      amount: 15
    },
    'payDay': {
      everyOther: 0.5,
      periodicity: 'd',
      amount: 15,
    },
    'monthly': {
      everyOther: 1,
      periodicity: 'M',
      amount: 1
    }
  }


  let dDate = moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD')
  let sDate = moment(date, 'YYYY-MM-DD')
  let iDate = moment(date, 'YYYY-MM-DD')
  let startDate = getStartDate(sDate)
  let firstInterestPaymentPortion = interestPortionCalc(iDate)
  let times = frequencyStructure[period].everyOther
  let amount = frequencyStructure[period].amount
  let periodicity = frequencyStructure[period].periodicity
  let interest = ((interestRate * times) / 100) * capital
  let amountOfPayments = duration * (1 / times)
  let principal = capital / amountOfPayments
  let payment = interest + principal

  let schedule = [{
    _loan: loan,
    date: dDate,
    payment: 0,
    interest: 0,
    principal: 0,
    balance: capital,
    status: "DISBURSTMENT",
    currency: currency
  }]


  for (let i = 1; i <= amountOfPayments; i++) {
    if (i < 2) {
      let amortization_pmt = {
        _loan: loan,
        date: startDate,
        payment: interest * firstInterestPaymentPortion,
        interest: interest * firstInterestPaymentPortion,
        principal: principal,
        balance: capital,
        status: "DUE",
        currency: currency
      }
      schedule.push(amortization_pmt)

    } else {
      if (moment(startDate).add((i - 1) * amount, periodicity).date() < 16) {
        date = moment(startDate).add((i - 1) * amount, periodicity).set({
          date: 15
        })
      } else {
        let lastDay = moment(startDate).add((i - 1) * amount, periodicity).endOf('month').date()
        date = moment(startDate).add((i - 1) * amount, periodicity).set({
          date: lastDay
        })
      }
      let amortization_pmt = {
        _loan: loan,
        date: date.format('YYYY-MM-DD'),
        payment: payment,
        interest: interest,
        principal: principal,
        balance: capital - ((i) * principal),
        status: "PENDING",
        currency: currency
      }
      schedule.push(amortization_pmt)

    }
  }
  return schedule
}

const annuity = (C, i, n) => C * (i / (1 - (1 + i) ** (-n)));


// saca proporciones 
const balance_t = (loan, C, i, P, date, j, amount, periodicity, currency) => {
  const period_movements = {}
  period_movements._loan = loan
  period_movements.date = moment(date).add(j * amount, periodicity).format('YYYY-MM-DD')
  period_movements.interest = C * i;
  period_movements.principal = P - (C * i);
  period_movements.payment = P;
  period_movements.balance = Math.round((C - period_movements.principal) * 100) / 100;
  period_movements.status = "DUE"
  period_movements.currency = currency

  return period_movements;
}


const amortLoan = (loan, period, duration, interest, capital, date, currency) => {

  const frequencyStructure = {
    'biWeekly': {
      everyOther: 0.5,
      periodicity: 'd',
      amount: 15
    },
    'payDay': {
      everyOther: 0.5,
      periodicity: 'd',
      amount: 15,
    },
    'monthly': {
      everyOther: 1,
      periodicity: 'M',
      amount: 1
    }
  }

  let times = frequencyStructure[period].everyOther
  let amount = frequencyStructure[period].amount
  let periodicity = frequencyStructure[period].periodicity
  let n = duration * (1 / times)
  interest = interest / 100

  let schedule = [{
    _loan: loan,
    date: date,
    interest: 0,
    principal: 0,
    payment: 0,
    balance: capital,
    status: "DISBURSTMENT",
    currency: currency
  }]

  const payments = annuity(capital, interest, n);
  for (let j = 0; j < n; j++) {
    let a = schedule[schedule.length - 1]
    let entry = balance_t(loan, a.balance, interest, payments, date, j + 1, amount, periodicity, currency)
    schedule.push(entry)
  }

  return schedule

}


const linearLoan = (loan, period, duration, interest, capital, date, currency) => {

  const frequencyStructure = {
    'biWeekly': {
      everyOther: 0.5,
      periodicity: 'd',
      amount: 15
    },
    'payDay': {
      everyOther: 0.5,
      periodicity: 'd',
      amount: 15,
    },
    'monthly': {
      everyOther: 1,
      periodicity: 'M',
      amount: 1
    }
  }


  let times = frequencyStructure[period].everyOther
  let amount = frequencyStructure[period].amount
  let periodicity = frequencyStructure[period].periodicity
  let interestPmt = ((interest * times) / 100) * capital
  let numberOfPayments = duration * (1 / times)
  let principal = capital / numberOfPayments
  let payment = interestPmt + principal


  let schedule = [{
    _loan: loan,
    date: date,
    payment: 0,
    interest: 0,
    principal: 0,
    balance: capital,
    status: "DISBURSTMENT",
    currency: currency
  }]

  let t1 = moment(date)

  for (let i = 1; i <= numberOfPayments; i++) {

    let t2 = moment(date).add(i, "M");
    let days = t2.diff(t1, 'days')

    let amortization_pmt = {
      _loan: loan,
      date: moment(date).add(i * amount, periodicity).format('YYYY-MM-DD'),
      payment: payment,
      interest: interestPmt,
      principal: principal,
      balance: capital - (i * principal),
      status: days > 31 ? 'PENDING' : 'DUE',
      currency: currency
    }
    schedule.push(amortization_pmt)
  }

  return schedule
}


function lumpSumLoan(loan, frequency, duration, interest, capital, date) {

  let interestPmt = (interest / 100) * capital
  let principal = capital
  let payment = interestPmt
  let finalPayment = interestPmt + principal

  let schedule = [{
    _loan: loan,
    date: date,
    payment: 0,
    interest: 0,
    principal: 0,
    balance: capital,
    status: "DISBURSTMENT"
  }]


  let t1 = moment(date)

  for (let i = 1; i <= duration; i++) {

    let t2 = moment(date).add(i, "M");
    let days = t2.diff(t1, 'days')

    if (i < duration) {
      let amortization_pmt = {
        _loan: loan,
        date: moment(date).add(i, "M").format('YYYY-MM-DD'),
        payment: payment,
        interest: interestPmt,
        principal: 0,
        balance: principal,
        status: days > 31 ? 'PENDING' : 'DUE'
      }
      schedule.push(amortization_pmt)
    } else {
      let amortization_pmt = {
        _loan: loan,
        date: moment(date).add(i, "M").format('YYYY-MM-DD'),
        payment: finalPayment,
        interest: interestPmt,
        principal: principal,
        balance: 0,
        status: days > 31 ? 'PENDING' : 'DUE'
      }
      schedule.push(amortization_pmt)
    }
  }
  return schedule
}

const linearLoanIntFirst = (loan, period, duration, interest, capital, date, paymentDate, currency) => {

  const frequencyStructure = {
    'biWeekly': {
      everyOther: 0.5,
      periodicity: 'd',
      amount: 15
    },
    'payDay': {
      everyOther: 0.5,
      periodicity: 'd',
      amount: 15,
    },
    'monthly': {
      everyOther: 1,
      periodicity: 'M',
      amount: 1
    }
  }


  let times = frequencyStructure[period].everyOther
  let amount = frequencyStructure[period].amount
  let periodicity = frequencyStructure[period].periodicity
  let interestPmt = ((interest * times) / 100) * capital
  let numberOfPayments = duration * (1 / times)
  let principal = capital / numberOfPayments
  let payment = interest + principal


  let schedule = [{
    _loan: loan,
    date: date,
    payment: 0,
    interest: 0,
    principal: 0,
    balance: capital,
    status: "DISBURSTMENT",
    currency: currency
  }]

  let t1 = moment(date)

  for (let i = 1; i <= numberOfPayments + 1; i++) {

    let t2 = moment(date).add(i, "M");
    let days = t2.diff(t1, 'days')
    if (i > 1) {

      let amortization_pmt = {
        _loan: loan,
        date: moment(paymentDate).add((i - 1) * amount, periodicity).format('YYYY-MM-DD'),
        payment: payment,
        interest: interestPmt,
        principal: principal,
        balance: capital - ((i - 1) * principal),
        status: days > 31 ? 'PENDING' : 'DUE',
        currency: currency
      }
      schedule.push(amortization_pmt)

    } else {

      let amortization_pmt = {
        _loan: loan,
        date: moment(paymentDate).format('YYYY-MM-DD'),
        payment: daysDiff(date, paymentDate) * (-interestPmt / 30),
        interest: daysDiff(date, paymentDate) * (-interestPmt / 30),
        principal: 0,
        balance: capital,
        status: days > 31 ? 'PENDING' : 'DUE',
        currency: currency
      }
      schedule.push(amortization_pmt)
    }
  }

  return schedule
}

const daysDiff = (initialDate, lastDate) => {
  var now = moment(initialDate); //todays date
  var end = moment(lastDate); // another date
  var duration = moment.duration(now.diff(end));
  var days = duration.asDays();
  return days
}


const factoring = (loan, startDate, days, interest, capital, currency) => {
  let schedule = []

  let dailyInterest = ((interest / 100) * 12) / 360
  interest = dailyInterest * days * capital
  capital = capital - interest

  amortization_pmt = {
    _loan: loan,
    date: moment(startDate).format('YYYY-MM-DD'),
    payment: 0,
    interest: 0,
    principal: 0,
    balance: capital,
    status: "DISBURSTMENT",
    currency: currency
  }
  schedule.push(amortization_pmt)
  amortization_pmt = {
    _loan: loan,
    date: moment(startDate).add(days, 'days').format('YYYY-MM-DD'),
    payment: capital + interest,
    interest: interest,
    principal: capital,
    balance: 0,
    status: days > 31 ? 'PENDING' : 'DUE',
    currency: currency
  }
  schedule.push(amortization_pmt)

  return schedule
}


const loanSelector = (loanId, loanDetails, currency) => {

  let {
    loanType,
    period,
    duration,
    interest,
    capital,
    startDate,
    paymentDate,
    startAmortPeriod,
    days
  } = loanDetails

  interest = parseFloat(interest)
  duration = parseFloat(duration)
  capital = parseFloat(capital)
  days = parseFloat(days)

  switch (loanType) {
    case 'linear':
      return linearLoan(loanId, period, duration, interest, capital, startDate, currency)
    case 'lumpSum':
      return lumpSumLoan(loanId, period, duration, interest, capital, startDate, currency)
    case 'linearIntFirst':
      return linearLoanIntFirst(loanId, period, duration, interest, capital, startDate, paymentDate, currency)
    case 'monday':
      return mondayPayDayLoan(loanId, duration, interest, capital, startDate, paymentDate, currency)
    case 'payDay':
      return payDayLoan(loanId, period, duration, interest, capital, startDate, currency)
    case 'factoring':
      return factoring(loanId, startDate, days, interest, capital, currency)
    case 'amort':
      return amortLoan(loanId, period, duration, interest, capital, startDate, currency)
    case 'amort2':
      return amort2Loan(loanId, duration, period, startDate, paymentDate, startAmortPeriod, interest, capital, currency)
  }
}


module.exports = {
  loanSelector,
  payDayLoan,
  linearLoan,
  linearLoanIntFirst,
  lumpSumLoan
}