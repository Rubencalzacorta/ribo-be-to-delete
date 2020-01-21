let Transaction = require('../Transaction')
let User = require('../User')
var mongoose = require('mongoose')
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
    txs = _.flattenDeep(txs)
    return txs
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
        _loan: mongoose.Types.ObjectId(txDetails._loan),
        _investor: mongoose.Types.ObjectId(investor._investor._id),
        _loanSchedule: mongoose.Types.ObjectId(txDetails._loanSchedule),
        _payment: mongoose.Types.ObjectId(txDetails._payment),
        date: txDetails.date,
        cashAccount: txDetails.cashAccount,
        currency: txDetails.currency,
        concept: 'CAPITAL',
        amount: txDetails.principal * investor.pct,
    }
}

const mgmtInterestFixedTxs = (txDetails, investor) => {
    txs = []
    investor._investor.managementFee.forEach(e => {
        txs.push({
            _loan: mongoose.Types.ObjectId(txDetails._loan),
            _investor: mongoose.Types.ObjectId(e._managementAccount),
            _loanSchedule: mongoose.Types.ObjectId(txDetails._loanSchedule),
            _payment: mongoose.Types.ObjectId(txDetails._payment),
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'MANAGEMENT_INTEREST_INCOME',
            amount: investor.pct * txDetails.interest * e.pct
        }, {
            _loan: mongoose.Types.ObjectId(txDetails._loan),
            _investor: mongoose.Types.ObjectId(e._investor),
            _loanSchedule: mongoose.Types.ObjectId(txDetails._loanSchedule),
            _payment: mongoose.Types.ObjectId(txDetails._payment),
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'MANAGEMENT_INTEREST_COST',
            amount: investor.pct * txDetails.interest * e.pct,
        })
    })
    return txs
}


const mgmtFeeTxs = (txDetails, investor) => {
    txs = []
    investor._investor.managementFee.forEach(e => {
        txs.push({
            _loan: mongoose.Types.ObjectId(txDetails._loan),
            _investor: mongoose.Types.ObjectId(e._managementAccount),
            _loanSchedule: mongoose.Types.ObjectId(txDetails._loanSchedule),
            _payment: mongoose.Types.ObjectId(txDetails._payment),
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'MANAGEMENT_FEE_INCOME',
            amount: investor.pct * txDetails.interest * e.pct,
        }, {
            _loan: mongoose.Types.ObjectId(txDetails._loan),
            _investor: mongoose.Types.ObjectId(e._investor),
            _loanSchedule: mongoose.Types.ObjectId(txDetails._loanSchedule),
            _payment: mongoose.Types.ObjectId(txDetails._payment),
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'MANAGEMENT_FEE_COST',
            amount: investor.pct * txDetails.interest * e.pct
        })
    })
    return txs
}

const commissionTx = (txDetails, managementAccount) => {

    txs = []
    txDetails._commission.forEach(commission => {
        txs.push({
            _loan: mongoose.Types.ObjectId(commission._loan),
            _investor: mongoose.Types.ObjectId(managementAccount),
            _loanSchedule: mongoose.Types.ObjectId(txDetails._loanSchedule),
            _payment: mongoose.Types.ObjectId(txDetails._payment),
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'COMMISSION_COST',
            amount: txDetails.interest * commission.pct
        }, {
            _loan: mongoose.Types.ObjectId(commission._loan),
            _investor: mongoose.Types.ObjectId(commission._salesman),
            _loanSchedule: mongoose.Types.ObjectId(txDetails._loanSchedule),
            _payment: mongoose.Types.ObjectId(txDetails._payment),
            date: txDetails.date,
            cashAccount: txDetails.cashAccount,
            currency: txDetails.currency,
            concept: 'COMMISSION_INCOME',
            amount: txDetails.interest * commission.pct
        })
    })
    return txs
}


const investorInterestTx = (txDetails, investor) => {
    return {
        _loan: mongoose.Types.ObjectId(txDetails._loan),
        _investor: mongoose.Types.ObjectId(investor._investor._id),
        _loanSchedule: mongoose.Types.ObjectId(txDetails._loanSchedule),
        _payment: mongoose.Types.ObjectId(txDetails._payment),
        date: txDetails.date,
        cashAccount: txDetails.cashAccount,
        currency: txDetails.currency,
        concept: 'INTEREST',
        amount: investor.pct * txDetails.interest
    }
}


const fixedInterestTxs = (txDetails, investor, managementAccount) => {
    let interestTx = investorInterestTx(txDetails, investor)
    let feesTx = mgmtInterestFixedTxs(txDetails, investor, managementAccount)
    let a = [interestTx, ...feesTx]
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
    let user = await User.find({
        firstName: 'Ribo Capital',
        location: investors[0]._investor.location
    })
    return user._id
}


txPlacer = async (result, investors, loan, IandK, next) => {

    let session = await Transaction.startSession()

    session.startTransaction()

    try {
        let dd = distributorDetails(result, investors, loan, IandK)
        let managementAccount = await managementAccountFinder(investors)
        let capital = capitalDistributor(dd)
        let interest = interestDistributor(dd, managementAccount)
        let commission = commissionDistributor(dd, managementAccount)
        let txs = [...capital, ...interest, ...commission]

        txs.map(e => {
            return Transaction.create([e], {
                session
            })
        })

        await session.commitTransaction()

    } catch (e) {
        session.abortTransaction()
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