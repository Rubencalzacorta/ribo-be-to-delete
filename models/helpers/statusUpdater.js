const statusUpdater = (loan) => {
    let totalPaid = loan.loanSchedule.reduce( (acc, e) => {
      if (e.principal_pmt === undefined) {
        pmt = 0
      } else {
        pmt = e.principal_pmt
      }
      return acc + pmt
    }, 0)
    

    let status = "OPEN"

    if ( totalPaid >= loan.capital) {
      status = "CLOSED";
    } else if ( loan.capital - totalPaid < 1 ) {
      status = "CLOSED"
    } 

    return {
      totalPaid: totalPaid,
      status: status,
      capitalRemaining: loan.capital - totalPaid
    }
}

module.exports = statusUpdater