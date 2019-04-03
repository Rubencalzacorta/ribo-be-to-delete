const moment = require('moment')




const linearLoan = (loan, duration, interest, capital, date) => {

    var interest = (interest / 100) * capital
    var principal = capital / duration
    var payment = interest + principal

    schedule = [{
      _loan: loan,
      date: date,
      payment: 0,
      interest: 0,
      principal: 0,
      balance: capital,
      tracking: "disburstment"
    }]

    for (i = 1; i <= duration; i++) {
      amortization_pmt = {
        _loan: loan,
        date: moment(date).add(i, "M").format('YYYY-MM-DD'),
        payment: payment,
        interest: interest,
        principal: principal,
        balance: capital - (i*principal),
        tracking: "payment due"
      }
      schedule.push(amortization_pmt)
    }

    return schedule

}

function lumpSumLoan(loan, duration, interest, capital, date) {

    var interest = (interest / 100) * capital
    var principal = capital
    var payment = interest
    var finalPayment = interest + principal

    schedule = [{
        _loan: loan,
        date: date,
        payment: 0,
        interest: 0,
        principal: 0,
        balance: capital,
        tracking: "disburstment"
    }]

    for (i = 1; i <= duration; i++) {
      if ( i < duration ) {
        amortization_pmt = {
            _loan: loan,
            date: moment(date).add(i, "M").format('YYYY-MM-DD'),
            payment: payment,
            interest: interest,
            principal: 0,
            balance: principal,
            tracking: "payment due"
        }
        schedule.push(amortization_pmt)
      } else {
        amortization_pmt = {
            _loan: loan,
            date: moment(date).add(i, "M").format('YYYY-MM-DD'),
            payment: finalPayment,
            interest: interest,
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
    linearLoan,
    lumpSumLoan
}