const moment = require('moment')

const interestPortionCalc = (date) => {
  let day = date.date()
  let lastDay = date.endOf('month').date()

  if ( day > 10 && day <= 15) {
    return ((lastDay-day)*(1/15))
  } else if ( day >= 1 && day <= 10 ) {
    return ( (16-day)*(1/15))
  } else if ( day > 15 && day <= 25 ) {
    return ((lastDay+1-day)*(1/(lastDay-15)))
  } else if ( day > 25 && day <= lastDay ) {
    return ((lastDay-day+15)*(1/(lastDay-15)))
  }
}


const getStartDate = (date) => {

  let day = moment(date).date()
  let year = moment(date).year()
  let month = moment(date).month() 
  let lastDay = date.endOf('month').date()
  console.log(day, lastDay)
  if ( day > 10 && day <= 15) {
    return moment([year, month, lastDay]).format('YYYY-MM-DD')
  } else if ( day >= 1 && day <= 10 ) {
    return moment([year, month, 15]).format('YYYY-MM-DD')
  } else if ( day > 15 && day <= 25 ) {
    return moment([year, month, lastDay]).format('YYYY-MM-DD')
  } else if ( day > 25 && day <= lastDay ) {
    return moment([year, month, 15]).add(1, 'M').format('YYYY-MM-DD')
  }
}

const payDayLoan = (loan, period, duration, interestRate, capital, date) => {

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
    let interest = ((interestRate*times) / 100) * capital
    let amountOfPayments = duration*(1/times)
    let principal = capital / amountOfPayments
    let payment = interest + principal

    let schedule = [{
      _loan: loan,
      date: dDate,
      payment: 0,
      interest: 0,
      principal: 0,
      balance: capital,
      tracking: "disburstment"
    }]


    for (let i = 1; i <= amountOfPayments; i++) {
      if (i < 2) {
          let amortization_pmt = {
            _loan: loan,
            date: startDate,
            payment: interest*firstInterestPaymentPortion,
            interest: interest*firstInterestPaymentPortion,
            principal: principal,
            balance: capital,
            tracking: "payment due"
          }
          schedule.push(amortization_pmt)

      } else {
        if (moment(startDate).add((i-1)*amount, periodicity).date() < 16) {
          date = moment(startDate).add((i-1)*amount, periodicity).set({date: 15})
        } else {
          let lastDay = moment(startDate).add((i-1)*amount, periodicity).endOf('month').date()
          date = moment(startDate).add((i-1)*amount, periodicity).set({date: lastDay})
        }
        let amortization_pmt = {
          _loan: loan,
          date: date.format('YYYY-MM-DD'),
          payment: payment,
          interest: interest,
          principal: principal,
          balance: capital - ((i)*principal),
          tracking: "payment due"
        }
        schedule.push(amortization_pmt)

    }}
    return schedule
}


const linearLoan = (loan, period, duration, interest, capital, date) => {

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


    var times = frequencyStructure[period].everyOther
    var amount = frequencyStructure[period].amount
    var periodicity = frequencyStructure[period].periodicity
    var interestPmt = ((interest*times) / 100) * capital
    var numberOfPayments = duration*(1/times)
    var principal = capital / numberOfPayments
    var payment = interest + principal
    

    let schedule = [{
      _loan: loan,
      date: date,
      payment: 0,
      interest: 0,
      principal: 0,
      balance: capital,
      tracking: "disburstment"
    }]

    for (let i = 1; i <= numberOfPayments; i++) {
      
      let amortization_pmt = {
        _loan: loan,
        date: moment(date).add(i*amount, periodicity).format('YYYY-MM-DD'),
        payment: payment,
        interest: interestPmt,
        principal: principal,
        balance: capital - (i*principal),
        tracking: "payment due"
      }
      schedule.push(amortization_pmt)
    }

    return schedule
}

function lumpSumLoan(loan, frequency, duration, interest, capital, date) {

    var interestPmt = (interest / 100) * capital
    var principal = capital
    var payment = interestPmt
    var finalPayment = interestPmt + principal

    let schedule = [{
        _loan: loan,
        date: date,
        payment: 0,
        interest: 0,
        principal: 0,
        balance: capital,
        tracking: "disburstment"
    }]

    for (let i = 1; i <= duration; i++) {
      if ( i < duration ) {
        let amortization_pmt = {
            _loan: loan,
            date: moment(date).add(i, "M").format('YYYY-MM-DD'),
            payment: payment,
            interest: interestPmt,
            principal: 0,
            balance: principal,
            tracking: "payment due"
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
            tracking: "payment due"
        }
        schedule.push(amortization_pmt)
      }
    }

    return schedule

}

module.exports = {
  payDayLoan,
  linearLoan,
  lumpSumLoan
}

