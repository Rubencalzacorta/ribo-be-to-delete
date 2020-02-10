const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan')
const LoanSchedule = require('../models/LoanSchedule')
const Transaction = require('../models/Transaction')
const moment = require('moment')
const _ = require('lodash')


router.get('/loans/:status', async (req, res, next) => {
    let loans = await findLoans('CLOSED')

    let statusChanges = {
        disburstment: [],
        paid: [],
        closed: [],
        incomplete: []
    }

    await loans.map(async l => {

        let sortedSched = _.sortBy(l.loanSchedule, ['date'])
        let capital = l.capital
        let accumPmts = 0
        // console.log(l._id)

        await sortedSched.forEach((e, i) => {

            if (i === 0) {
                statusChanges.disburstment.push(e._id)
            } else if (i === 1 && (e.interest_pmt + e.principal_pmt >= e.interest + e.principal - 35)) {
                statusChanges.paid.push(e._id)
            } else if (e.interest_pmt + e.principal_pmt >= (e.interest + e.principal - 1)) {
                statusChanges.paid.push(e._id)
            } else if (accumPmts >= capital - 1) {
                statusChanges.closed.push(e._id)
            } else if (accumPmts <= capital - 1 && e.interest_pmt + e.principal_pmt <= (e.interest + e.principal - 2)) {
                statusChanges.incomplete.push(e._id)
            }

            accumPmts += e.principal_pmt
            if (l._id == '5d51a1804e9e650017c00b5a') {
                console.log(accumPmts, capital)
            }
        })
    })

    bulk = LoanSchedule.collection.initializeOrderedBulkOp();
    bulk.find({
        '_id': {
            $in: statusChanges.disburstment
        }
    }).update({
        $set: {
            status: 'DISBURSTMENT'
        }
    });
    bulk.find({
        '_id': {
            $in: statusChanges.incomplete
        }
    }).update({
        $set: {
            status: 'OUTSTANDING'
        }
    });
    bulk.find({
        '_id': {
            $in: statusChanges.paid
        }
    }).update({
        $set: {
            status: 'PAID'
        }
    });

    bulk.find({
        '_id': {
            $in: statusChanges.closed
        }
    }).update({
        $set: {
            status: 'CLOSED'
        }
    });



    bulk.execute(function (error) {
        console.log('done');
    });

    res.status(200).json({
        len: statusChanges.length,
        ls: statusChanges
    })
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

router.post('/delete-misplaced', (req, res, next) => {
    let {
        acc,
        id
    } = req.body

    Transaction.deleteMany({
            _investor: id,
            cashAccount: acc
        })
        .then((r) => {
            res.status(200).json(r)
        })
        .catch((e) => {
            res.status(500).json(e.message)
        })
})


router.post('/delete-dated', (req, res, next) => {
    gteDate = moment('2019-11-19T09:00:40.974Z')

    Transaction.deleteMany({
        created_at: {
            $gte: gteDate
        }
    }).then(r => {
        res.status(200).json({
            r
        })
    })
})

router.post('/add-int', async (req, res, next) => {

    let {
        peru,
        dom,
        us
    } = req.body

    try {
        // let jintPeru = await interestConsolidation(peru.concept, peru.acc, peru.id)
        let jIntDominicana = await interestConsolidation(dom.concept, dom.acc, dom.id)
        // console.log(jIntDominicana)
        // let jIntGFUSA = await interestConsolidation(us.concept, us.gfacc, us.id)
        // let jIntGCUSA = await interestConsolidation(us.concept, us.gcacc, us.id)
        // let jrevPeru = await reverseTxs(peru.concept, peru.acc, peru.id)
        let jrevDominicana = await reverseTxs(dom.concept, dom.acc, dom.id)
        // console.log(jrevDominicana)
        // let jrevGFUSA = await reverseTxs(us.concept, us.gfacc, us.id)
        // let jrevGCUSA = await reverseTxs(us.concept, us.gcacc, us.id)

        Transaction.insertMany([
            //     // ...jintPeru,
            ...jIntDominicana,
            //     // ...jIntGCUSA,
            //     // ...jIntGFUSA,
            ...jrevDominicana,
            //     // ...jrevGCUSA,
            //     // ...jrevGFUSA,
            //     // ...jrevPeru
        ]).then(r => res.status(200).json(r))
    } catch (e) {
        res.status(500).json(e.message)
    }

})

const findLoans = async (status) => {
    return await Loan.find({
            status: status
        })
        .select({
            'loanSchedule': 1,
            'status': 1,
            'capital': 1,
            'investors': 0,
            '_borrower': 0,
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


router.post('/addCommissionField', async (req, res, next) => {
    Transaction.updateMany({
        _investor: null,
        currency: 'DOP',
        concept: 'COMMISSION'
    }, {
        _investor: '5d713e42e256d90017eb4857'
    }).then(r => res.status(200).json(r))
})

const reverseTxs = async (concept, cashAccount, id) => {
    adate = new Date('2019-11-18T00:00:40.974Z')
    return await Transaction.aggregate([{
        '$match': {
            'concept': concept,
            'cashAccount': cashAccount,
            'created_at': {
                $lte: adate
            }
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


router.patch('/cash-account/fix', async (req, res, next) => {
    Transaction.aggregate([{
            '$match': {
                'cashAccount': {
                    '$exists': false
                }
            }
        }, {
            '$project': {
                '_id': 1
            }
        }, {
            '$group': {
                '_id': null,
                'txs': {
                    '$push': '$_id'
                }
            }
        }, {
            '$project': {
                '_id': 0,
                'txs': 1
            }
        }]).then(txs => {
            return Transaction.updateMany({
                _id: {
                    $in: txs[0].txs
                }
            }, {
                cashAccount: 'RBPERU'
            })
        })
        .then(resp => res.status(200).json(resp))
})

router.post('/concept-modifier', async (req, res, next) => {

    a = await Transaction.updateMany({
        credit: {
            $gte: 0
        },
        debit: 0,
        concept: 'MANAGEMENT_FEE'
    }, {
        'concept': 'MANAGEMENT_FEE_COST'
    })

    b = await Transaction.updateMany({
        credit: {
            $gte: 0
        },
        debit: 0,
        concept: 'MANAGEMENT_INTEREST'
    }, {
        'concept': 'MANAGEMENT_INTEREST_COST'
    })

    c = await Transaction.updateMany({
        debit: {
            $gte: 0
        },
        credit: 0,
        concept: 'MANAGEMENT_FEE'
    }, {
        'concept': 'MANAGEMENT_FEE_INCOME'
    })

    d = await Transaction.updateMany({
        debit: {
            $gte: 0
        },
        credit: 0,
        concept: 'MANAGEMENT_INTEREST'
    }, {
        'concept': 'MANAGEMENT_INTEREST_INCOME'
    })

    Promise.all([a, b, c, d]).then(
        r => res.status(200).json(r)
    )

})



const interestConsolidation = async (concept, cashAccount, id) => {
    adate = new Date('2019-11-18T00:00:40.974Z')
    return await Transaction.aggregate([{
        '$match': {
            'concept': concept,
            'cashAccount': cashAccount,
            'created_at': {
                $lte: adate
            }
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