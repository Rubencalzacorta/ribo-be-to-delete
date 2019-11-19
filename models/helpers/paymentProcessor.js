let Transaction = require('../Transaction')
let User = require('../User')
const _ = require('lodash')
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


const interestDistributor = (details, managementAccount) => {
    if (!details.interest) {
        console.log(`status: no interest to distribute`)
        return []
    }

    let txs = details.investors.map((investor) => {
        if (investor._investor.investorType === 'FIXED_INTEREST') {
            return fixedInterestTxs(details, investor, managementAccount)
        } else {
            return variableInterestTxs(details, investor, managementAccount)
        }
    })

    return _.flattenDeep(txs)
}

const commissionDistributor = (details, managementAccount) => {
    if (details._commission === []) {
        console.log(`status: no commissions to distribute`)
        return []
    }

    return commissionTx(details, managementAccount)
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
        }, {
            _loan: txDetails._loan,
            _investor: e._investor,
            _loanSchedule: txDetails._loanSchedule,
            _payment: txDetails._payment,
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'MANAGEMENT_INTEREST',
            debit: 0,
            credit: investor.pct * txDetails.interest * e.pct,
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

const commissionTx = (txDetails, managementAccount) => {

    txs = []
    txDetails._commission.forEach(commission => {
        txs.push({
            _loan: commission._loan,
            _investor: managementAccount,
            _loanSchedule: txDetails._loanSchedule,
            _payment: txDetails._payment,
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'COMMISSION',
            debit: 0,
            credit: txDetails.interest * commission.pct
        }, {
            _loan: commission._loan,
            _investor: commission._salesman,
            _loanSchedule: txDetails._loanSchedule,
            _payment: txDetails._payment,
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'COMMISSION',
            debit: txDetails.interest * commission.pct,
            credit: 0
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


const fixedInterestTxs = (txDetails, investor, managementAccount) => {
    let interestTx = investorInterestTx(txDetails, investor)
    let feesTx = mgmtInterestFixedTxs(txDetails, investor, managementAccount)

    let a = [interestTx, ...feesTx]
    console.log(a)
    return a
}

const variableInterestTxs = (txDetails, investor, managementAccount) => {
    let interestTx = investorInterestTx(txDetails, investor)
    let feesTx = mgmtFeeTxs(txDetails, investor, managementAccount)
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
        _commission: loan.commission,
        investors: investors,
        _payment: result._id,
        date: result.date_pmt,
        cashAccount: result.cashAccount,
        currency: loan.currency,
        principal: IandK.principalPayment,
        interest: IandK.interestPayment,

    }
}

managementAccountFinder = async (investors) => {
    return await User.find({
        firstName: 'RIbo Capital',
        location: investors[0]._investor.location
    })
}

txPlacer = async (result, investors, loan, IandK) => {
    try {
        let dd = distributorDetails(result, investors, loan, IandK)
        let managementAccount = await managementAccountFinder(investors)
        let capital = capitalDistributor(dd)
        let interest = interestDistributor(dd, managementAccount)
        let commission = commissionDistributor(dd, managementAccount)
        let txs = [...capital, ...interest, ...commission]
        return Transaction.insertMany(txs)
    } catch (e) {
        next(e)
    }

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