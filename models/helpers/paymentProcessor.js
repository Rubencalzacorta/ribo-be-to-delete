let Transaction = require('../Transaction')

const capitalDistributor = (details) => {
    if (!details.principal) {
        console.log(`status: no capital to distribute`)
        return []
    }

    principalTxs = []
    details.investors.forEach(investor => {
        principalTxs.push(capitalTx(details, investor))
    })
    return principalTxs
}


const interestDistributor = (details) => {
    if (!details.interest) {
        console.log(`status: no interest to distribute`)
        return []
    }

    let txs = []
    details.investors.forEach(async (investor) => {
        if (investor._investor.investorType === 'FIXED_INTEREST') {
            txs.push(...mgmtInterestFixedTxs(details, investor))
        } else {
            txs.push(...variableInterestTxs(details, investor))
        }
    })
    return txs
}

const capitalTx = (txDetails, investor) => {
    return {
        _loan: txDetails._loan,
        _investor: investor._investor._id,
        _loanSchedule: txDetails._loanSchedule,
        _payment: txDetails._payment,
        date: txDetails.date,
        cashAccount: txDetails.cashAccount,
        currency: txDetails.currency,
        concept: 'CAPITAL',
        debit: txDetails.principal * investor.pct,
        credit: 0,
    }
}

const mgmtInterestFixedTxs = (txDetails, investor) => {
    txs = []
    investor._investor.managementFee.forEach(e => {
        txs.push({
            _loan: txDetails._loan,
            _investor: e._managementAccount,
            _loanSchedule: txDetails._loanSchedule,
            _payment: txDetails._payment,
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'MANAGEMENT_INTEREST',
            debit: investor.pct * txDetails.interest * e.pct,
            credit: 0,
        })
    })
    return txs
}


const mgmtFeeTxs = (txDetails, investor) => {
    txs = []
    investor._investor.managementFee.forEach(e => {
        txs.push({
            _loan: txDetails._loan,
            _investor: e._managementAccount,
            _loanSchedule: txDetails._loanSchedule,
            _payment: txDetails._payment,
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'MANAGEMENT_FEE',
            debit: investor.pct * txDetails.interest * e.pct,
            credit: 0,
        }, {
            _loan: txDetails._loan,
            _investor: e._investor,
            _loanSchedule: txDetails._loanSchedule,
            _payment: txDetails._payment,
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'MANAGEMENT_FEE',
            debit: 0,
            credit: investor.pct * txDetails.interest * e.pct
        })
    })
    return txs
}


const investorInterestTx = (txDetails, investor) => {
    return {
        _loan: txDetails._loan,
        _investor: investor._investor._id,
        _loanSchedule: txDetails._loanSchedule,
        _payment: txDetails._payment,
        date: txDetails.date,
        cashAccount: txDetails.cashAccount,
        currency: txDetails.currency,
        concept: 'INTEREST',
        debit: investor.pct * txDetails.interest,
        credit: 0,
    }
}

const variableInterestTxs = (txDetails, investor) => {
    let interestTx = investorInterestTx(txDetails, investor)
    let feesTx = mgmtFeeTxs(txDetails, investor)
    return [interestTx, ...feesTx]
}

intOrCapValidator = (intOrK, iok) => {
    if (!intOrK) {
        console.log(`status: no ${iok} to distribute`)
        return false
    }
}

let distributorDetails = (result, investors, loan, IandK) => {
    return {
        _loan: result._loan,
        _loanSchedule: result._loanSchedule,
        investors: investors,
        _payment: result._id,
        date: result.date_pmt,
        cashAccount: result.cashAccount,
        currency: loan.currency,
        principal: IandK.principalPayment,
        interest: IandK.interestPayment,

    }
}

txPlacer = async (result, investors, loan, IandK) => {
    let dd = distributorDetails(result, investors, loan, IandK)
    let capital = capitalDistributor(dd)
    let interest = interestDistributor(dd)

    let txs = [...capital, ...interest]
    return Transaction.insertMany(txs)
}

txDelete = async (id) => {
    return await Transaction.deleteMany({
        _payment: id
    })
}


module.exports = {
    interestDistributor,
    capitalDistributor,
    variableInterestTxs,
    distributorDetails,
    txPlacer,
    txDelete
}