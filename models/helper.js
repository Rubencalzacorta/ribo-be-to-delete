const statusUpdater = (loan) => {
    let totalPaid = loan.loanSchedule.reduce( (acc, e) => {
      if (e.principal_pmt === undefined) {
        pmt = 0
      } else {
        pmt = e.principal_pmt
      }
      return acc + pmt
    }, 0)
    

    let status = "open"

    if ( totalPaid >= loan.capital) {
      status = "closed";
    } else if ( loan.capital - totalPaid < 1 ) {
      status = "closed"
    } 

    update = {
      totalPaid: totalPaid,
      status: status,
      capitalRemaining: loan.capital - totalPaid
    }
  
    return update 
}

module.exports = statusUpdater