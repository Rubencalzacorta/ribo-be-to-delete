const interestDistributor = () => {


}

const capitalDistributor = (details) => {
    if (!details.amount) {
        console.log('status: no capital to distribute')
        return
    }

    principalTxs = []
    details.investors.forEach(investor => {
        principalTxs.push(capitalTx(details, investor))
    })

    return principalTxs
}


const managementFeeCharge = (details, interest) => {
    totalInt = 0
    details.investors.forEach(investor => {
        if (investor._investor.investorType === 'FIXED_INTEREST') {
            investor._investor.managementFee.forEach(e => {
                console.log('---------------------------------')
                console.log('FIXED: ', e)
                console.log('PCT: ', investor.pct)
                console.log('TOTAL_INT', investor.pct * interest)
                console.log('FEE:', e.pct)
                console.log('INTEREST:', investor.pct * interest * e.pct)
                console.log('---------------------------------')
                totalInt += Number((investor.pct * interest * e.pct).toFixed(4))
            })
        } else {
            investor._investor.managementFee.forEach(e => {
                console.log('---------------------------------')
                console.log('VARIABLE: ', e)
                console.log('PCT: ', investor.pct)
                console.log('TOTAL_INT', investor.pct * interest)
                console.log('FEE:', e.pct)
                console.log('INTEREST:', investor.pct * interest)
                console.log('INTEREST_INCOME:', investor.pct * interest * (1 - e.pct))
                console.log('MANAGEMENT_FEE_INCOME:', investor.pct * interest * e.pct)
                console.log('---------------------------------')
                totalInt += Number((investor.pct * interest * e.pct + investor.pct * interest * (1 - e.pct)).toFixed(4))
            })
        }

    })
    console.log(totalInt)
}




// let managementTransaction = {
//     _loan: investor._loan,
//     _investor: management._managementAccount,
//     _loanSchedule: mongoose.Types.ObjectId(installment),
//     date: date_pmt,
//     cashAccount: cashAccount,
//     currency: currency,
//     concept: "MANAGEMENT_INTEREST",
//     debit: investor.pct * interest_pmt * (management.pct),
// }
// pendingTransactions.push(managementTransaction)

const capitalTx = (txDetails, investor) => {

    return {
        _loan: txDetails._loan,
        _investor: investor._id,
        _loanSchedule: txDetails._loanSchedule,
        _payment: txDetails._payment,
        date: txDetails.date,
        cashAccount: txDetails.cashAccount,
        currency: txDetails.currency,
        concept: concept,
        debit: (txDetails.amount > 0) ? txDetails.amount * investor.pct : 0,
        credit: 0,
    }
}




module.exports = {
    interestDistributor,
    capitalDistributor,
    managementFeeCharge
}