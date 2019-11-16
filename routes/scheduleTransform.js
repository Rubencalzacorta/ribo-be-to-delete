const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan')
const Transaction = require('../models/Transaction')


router.get('/loans', async (req, res, next) => {
    let loans = await findLoans()
    let disburstmentLoanSchedule = loans.map(l => {
        return l.loanSchedule.filter((e, i) => {
            return i === 0
        })[0]
    })

    res.status(200).json(disburstmentLoanSchedule)
})


router.get('/it', async (req, res, next) => {
    try {
        let txs = await findConceptTxs('MANAGEMENT_INTEREST', 'RBPERU')
        res.status(200).json({
            results: txs.length,
            txs: txs
        })
    } catch (e) {
        res.status(500).json(e.message)
    }
})

router.post('/add-int', async (req, res, next) => {
    let {
        peru,
        dom,
        us
    } = req.body

    try {
        let jintPeru = await interestConsolidation(peru.concept, peru.acc, peru.id)
        let jIntDominicana = await interestConsolidation(dom.concept, dom.acc, dom.id)
        let jIntGFUSA = await interestConsolidation(us.concept, us.gfacc, us.id)
        let jIntGCUSA = await interestConsolidation(us.concept, us.gcacc, us.id)
        let jrevPeru = await reverseTxs(peru.concept, peru.acc, peru.id)
        let jrevDominicana = await reverseTxs(dom.concept, dom.acc, dom.id)
        let jrevGFUSA = await reverseTxs(us.concept, us.gfacc, us.id)
        let jrevGCUSA = await reverseTxs(us.concept, us.gcacc, us.id)

        Transaction.insertMany([
            ...jintPeru,
            ...jIntDominicana,
            ...jIntGCUSA,
            ...jIntGFUSA,
            ...jrevDominicana,
            ...jrevGCUSA,
            ...jrevGFUSA,
            ...jrevPeru
        ]).then(r => res.status(200).json(r))
    } catch (e) {
        res.status(500).json(e.message)
    }

})

router.get('/complete-details/:id', async (req, res, next) => {
    let {
        id
    } = req.params

    let Investors = await Investment.find({
        _loan: id
    }).populate('_investor', 'firstName lastName fullName amount pct ')
    let LoanDetails = await Loan.findById(id)
    let Transactions = await Transaction.find({
        _loan: id
    }).populate('_investor', 'firstName lastName').sort({
        date: 1,
        _payment: 1,
        concept: 1,
        debit: 1,
        credit: 1,
        _investor: 1
    })

    Promise.all([Investors, LoanDetails, Transactions])
        .then(objList => {
            res.status(200).json({
                investors: objList[0],
                details: objList[1],
                transactions: objList[2]
            })
        })
        .catch(e => next(e))
})

const findLoans = async () => {
    return await Loan.find({
            status: 'CLOSED'
        })
        .select({
            'loanSchedule': 1,
            'status': 1,
            'investors': 0,
            '_borrower': 0
        })

};

const findConceptTxs = async (concept, cashAcc) => {
    return await Transaction.find({
        concept: concept,
        cashAccount: cashAcc,
        _payment: {
            $ne: null
        }
    })
}

router.post('/reverse-txs', async (req, res, next) => {
    let {
        concept,
        acc,
        id
    } = req.body

    let int = await reverseTxs(concept, acc, id)
    Transaction.insertMany(int).then(r => res.status(200).json(r))
})


const reverseTxs = async (concept, cashAccount, id) => {

    return await Transaction.aggregate([{
        '$match': {
            'concept': concept,
            'cashAccount': cashAccount
        }
    }, {
        '$group': {
            '_id': {
                '_id': '$_id'
            },
            'debit': {
                '$first': '$credit'
            },
            'credit': {
                '$first': '$debit'
            },
            '_loan': {
                '$first': '$_loan'
            },
            '_payment': {
                '$first': '$_payment'
            },
            '_loanSchedule': {
                '$first': '$_loanSchedule'
            },
            'date': {
                '$first': '$date'
            },
            'cashAccount': {
                '$first': '$cashAccount'
            },
            'concept': {
                '$first': '$concept'
            }
        }
    }, {
        '$project': {
            '_id': 0,
            'debit': 1,
            'credit': 1,
            '_loan': 1,
            '_investor': {
                '$literal': id
            },
            '_payment': 1,
            '_loanSchedule': 1,
            'date': 1,
            'cashAccount': 1,
            'concept': 1
        }
    }])
}

const interestConsolidation = async (concept, cashAccount, id) => {
    return await Transaction.aggregate([{
        '$match': {
            'concept': concept,
            'cashAccount': cashAccount
        }
    }, {
        '$group': {
            '_id': {
                '_payment': '$_payment'
            },
            'debit': {
                '$sum': '$debit'
            },
            'credit': {
                '$sum': '$credit'
            },
            '_loan': {
                '$first': '$_loan'
            },
            '_investor': {
                '$first': '$_investor'
            },
            '_loanSchedule': {
                '$first': '$_loanSchedule'
            },
            'date': {
                '$first': '$date'
            },
            'cashAccount': {
                '$first': '$cashAccount'
            }
        }
    }, {
        '$project': {
            '_id': 0,
            '_payment': '$_id._payment',
            'debit': 1,
            'credit': 1,
            '_loan': 1,
            '_investor': {
                '$literal': id
            },
            '_loanSchedule': 1,
            'date': 1,
            'cashAccount': 1,
            'concept': {
                '$literal': 'INTEREST'
            }
        }
    }])
}


module.exports = router