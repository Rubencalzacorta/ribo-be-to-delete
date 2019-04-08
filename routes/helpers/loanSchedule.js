const moment = require('moment')



const linearLoan = (loan, period, duration, interest, capital, date) => {

    let frequencyStructure = {
        'biWeekly': {
          everyOther: 0.5,
          periodicity: 'd',
          amount: 15
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
    var interest_pmt = ((parseFloat(interest)*parseFloat(times) / 100) * parseFloat(capital))
    duration = parseFloat(duration)/parseFloat(times)
    var principal = parseFloat(capital)/duration
    var payment = parseFloat(interest_pmt) + parseFloat(principal)
    
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
      
      let amortization_pmt = {
        _loan: loan,
        date: moment(date).add(i*amount, periodicity).format('YYYY-MM-DD'),
        payment: payment,
        interest: interest_pmt,
        principal: principal,
        balance: capital - (i*principal),
        tracking: "payment due"
      }
      schedule.push(amortization_pmt)
    }

    return schedule

}

function lumpSumLoan(loan, period, duration, interest, capital, date) {


    let frequencyStructure = {
        'biWeekly': {
          everyOther: 0.5,
          periodicity: 'd',
          amount: 15
        },
        'monthly': {
          everyOther: 1,
          periodicity: 'M',
          amount: 1
        }
      }

      
    var times = frequencyStructure[period].everyOther
    var amount = frequencyStructure[period].amount
    var periodicity = frequencyStructure[period].periodicitys
    var interest_pmt = (interest*times / 100) * capital
    var principal = parseFloat(capital)
    var payment = interest_pmt
    duration = duration/times
    var finalPayment = parseFloat(interest_pmt) + parseFloat(principal)

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
            date: moment(date).add(i*amount, periodicity).format('YYYY-MM-DD'),
            payment: payment,
            interest: interest_pmt,
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
            interest: interest_pmt,
            principal: principal,
            balance: 0,
            tracking: "payment due"
        }
        schedule.push(amortization_pmt)
      }
    }

    return schedule

}

module.exports = { lumpSumLoan, linearLoan }