const express = require('express');
const _ = require('lodash');
const mongoose = require('mongoose')
const moment = require('moment')
const LoanSchedule = require('../models/LoanSchedule')
const Investment = require('../models/Investment')
const Transaction = require('../models/Transaction')
const uploadCloud = require('../config/cloudinary')

const simpleCrud = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }

    router.get('/', (req, res, next) => {
        Model.find()
            .then(objList => res.status(200).json(objList))
            .catch(e => next(e))
    })

    router.get('/investor/list', (req, res, next) => {
        Model.find({
                investor: true
            })
            .then(objList => res.status(200).json(objList))
            .catch(e => next(e))
    })

    router.get('/all-clients/:country/:query', (req, res, next) => {
        let {
            query,
            country
        } = req.params
        querym = (country === 'WORLD') ? {
            '$and': [{
                    'borrower': true
                },
                {
                    "$or": [{
                            'name': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'firstName': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'lastName': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'email': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'fullName': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'businessName': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                    ]
                }
            ]
        } : {
            '$and': [{
                    'borrower': true
                },
                {
                    "$or": [{
                            'name': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'firstName': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'lastName': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'email': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'fullName': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                        {
                            'businessName': {
                                '$regex': query,
                                '$options': 'i'
                            }
                        },
                    ]
                }
            ]
        }

        Model.find(querym)
            .populate({
                path: 'loans',
                match: {
                    status: 'OPEN',
                },
                select: {
                    loanSchedule: 1,
                    totalPaid: 1,
                    capitalRemaining: 1,
                    capital: 1,
                    investors: 0,
                    _borrower: 0
                }
            })
            .select({
                firstName: 1,
                lastName: 1,
                country: 1,
                businessName: 1,
                loans: 1
            })
            .then(objList => {
                return objList.map((e) => {
                    return {
                        _id: e._id,
                        firstName: e.firstName,
                        lastName: e.lastName,
                        country: e.country,
                        businessName: e.businessName,
                        loans: e.loans.map((j) => {
                            return {
                                _id: j._id,
                                totalPaid: j.totalPaid,
                                capital: j.capital,
                                capitalRemaining: j.capitalRemaining,
                                nextPayment: _.pick(j.loanSchedule.filter(e => e.status === 'OVERDUE' || e.status === 'DUE').sort(compare = (a, b) => {
                                    return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
                                })[0], ['_id', 'interest', 'principal', 'date'])
                            }
                        })
                    }
                })
            })
            .then(objList => res.status(200).json(objList))
            .catch(e => console.log(e))
    })

    router.get('/all-clients-name/:country', (req, res, next) => {

        Model.find({
                borrower: true,
                country: req.params.country
            }, null, {
                sort: {
                    lastName: 1
                }
            }).select({
                'firstName': 1,
                'lastName': 1
            })
            .then(objList => res.status(200).json(objList))
            .catch(e => console.log(e))
    })



    router.get('/investments/:id', (req, res, next) => {
        Investment.find({
                _investor: req.params.id
            })
            .populate({
                path: '_loan'
            })
            .then(objList => {
                res.status(200).json(objList)
            })
            .catch(e => next(e))
    })


    router.get('/:id', (req, res, next) => {
        let {
            id
        } = req.params
        Model.findById(id)
            .then(obj => res.status(200).json(obj))
            .catch(e => next(e))
    })

    router.get('/detail/:id', (req, res, next) => {
        let {
            id
        } = req.params
        Model.findById(id)
            .populate('loans')
            .then(obj => res.status(200).json(obj))
            .catch(e => next(e))
    })

    router.get('/detail/investmentStatus/:id', (req, res, next) => {
        let {
            id
        } = req.params
        Model.findById(id).select({
                isAutoInvesting: true
            })
            .then(obj => res.status(200).json(obj))
            .catch(e => next(e))
    })





    // CRUD: CREATE
    router.post('/', (req, res, next) => {
        const object = _.pickBy(req.body, (e, k) => paths.includes(k));
        Model.create(object)
            .then(obj => res.status(200).json({
                status: "success",
                response: obj
            }))
            .catch(e => next(e))
    })

    router.post('/detail/investmentStatus/:id', (req, res, next) => {
        let {
            id
        } = req.params

        Model.findOne({
            _id: id
        }, function (err, user) {
            let oldStatus = user.isAutoInvesting
            user.isAutoInvesting = !user.isAutoInvesting;
            user.save(function (err, updatedUser) {
                if (err) {
                    res.status(500).json({
                        updated: false
                    })
                }

                if (updatedUser) {
                    res.status(200).json({
                        updated: true,
                        isAutoInvesting: updatedUser.isAutoInvesting,
                    })
                }
            });
        });
    })


    router.post('/create-account', (req, res, next) => {
        let {
            details
        } = req.body

        Model.create(details)
            .then(obj => {
                res.status(200).json({
                    status: "success",
                    response: obj
                })
            })
            .catch(e => next(e))
    })

    router.post('/create', (req, res, next) => {

        const loanDetails = _.pickBy(req.body, (e, k) => paths.includes(k));
        let {
            _id,
            loanInterest,
            loanDuration,
            loanAmount,
            loanType,
            startDate,
            investors
        } = loanDetails
        let borrowerId = _id
        Model.create(loanDetails)
            .then(obj => {
                let loanId = obj._id
                schedule = (loanType == "linear") ? linearLoan(loanId, loanDuration, loanInterest, loanAmount, startDate) : lumpSumLoan(loanId, loanDuration, loanInterest, loanAmount, startDate)
                schedule.forEach(e => {
                    LoanSchedule.create(e)
                        .then((schedule_t) => {
                            Model.findByIdAndUpdate(loanId, {
                                    $push: {
                                        loanSchedule: schedule_t._id
                                    }
                                }, {
                                    safe: true,
                                    upsert: true
                                })
                                .then()
                        })
                })
                return obj;
            })
            .then(obj => {
                let loanId = obj._id
                let investments = investors.map(e => ({
                    _loan: loanId,
                    ...e
                }))
                investments.forEach(e => {
                    Investment.create(e)
                        .then((investment_x) => {
                            Model.findByIdAndUpdate(loanId, {
                                $push: {
                                    investors: investment_x._id
                                }
                            }, {
                                safe: true,
                                upsert: true
                            }).exec()
                        })
                })
                return obj
            })
            .then(obj => {
                User.findByIdAndUpdate(borrowerId, {
                    $push: {
                        loans: obj._id
                    }
                }, {
                    safe: true,
                    upsert: true
                }).exec()
            })
            .then(obj => {
                let loanId = obj._id
                let investments = investors.map(e => ({
                    _loan: loanId,
                    ...e
                }))
                pendingTransactions = []
                investments.forEach(e => {
                    transaction = {
                        _loan: loanId,
                        _investor: e._investor,
                        date: new Date(),
                        cashAccount: e.cashAccount,
                        concept: "INVESTMENT",
                        amount: e.amount
                    }
                    pendingTransactions.push(transaction)
                })
                Transaction.insertMany(pendingTransactions)

                return obj
            })
            .then(obj => res.status(200).json(obj))
            .catch(e => next(e))
    })

    // CRUD: UPDATE
    router.patch('/update/details/:id', (req, res, next) => {
        const {
            id
        } = req.params;
        updates = req.body.details
        Model.findByIdAndUpdate(id, updates, {
                new: true
            })
            .then(obj => {
                res.status(200).json({
                    status: 'updated',
                    obj
                });
            })
            .catch(e => next(e))
    })
    router.post('/update/documentID/:id',
        uploadCloud.single('photo'), (req, res, next) => {
            try {
                updates = req.file ? req.file.url : null;
                Model.findByIdAndUpdate(req.params.id, {
                        documentID: updates
                    }, {
                        new: true
                    })
                    .then(obj => {
                        res.status(200).json({
                            status: 'updated',
                            obj
                        });
                    })
            } catch (err) {
                console.log(err)
            }
        })

    router.post('/update/documentIncome/:id',
        uploadCloud.single('photo'), (req, res, next) => {
            try {
                updates = req.file ? req.file.url : null;

                Model.findByIdAndUpdate(req.params.id, {
                        documentIncomeOrPayslip: updates
                    }, {
                        new: true
                    })
                    .then(obj => {
                        res.status(200).json({
                            status: 'updated',
                            obj
                        });
                    })
            } catch (err) {
                console.log(err)
            }
        })

    router.patch('/loan-payment/:id', (req, res, next) => {

        const {
            id
        } = req.params;
        const {
            cashAccount,
            fee,
            interest_pmt,
            principal_pmt
        } = req.body
        const object = _.pickBy(req.body, (e, k) => paths.includes(k));
        const updates = _.pickBy(object, _.identity);

        Model.findByIdAndUpdate(id, updates, {
                new: true
            })
            .then(obj => {
                return Investment.find({
                    _loan: obj._loan
                }).exec()
            })
            .then(investors => {
                pendingTransactions = []
                investors.forEach(e => {
                    interestTransaction = {
                        _loan: mongoose.Types.ObjectId(e._loan),
                        _investor: mongoose.Types.ObjectId(e._investor),
                        _loanSchedule: mongoose.Types.ObjectId(id),
                        date: new Date(),
                        cashAccount: cashAccount,
                        concept: "INTEREST",
                        amount: interest_pmt * e.pct,
                    }
                    pendingTransactions.push(interestTransaction)
                    principalTransaction = {
                        _loan: mongoose.Types.ObjectId(e._loan),
                        _investor: mongoose.Types.ObjectId(e._investor),
                        _loanSchedule: mongoose.Types.ObjectId(id),
                        date: new Date(),
                        cashAccount: cashAccount,
                        concept: "CAPITAL",
                        amount: principal_pmt * e.pct,
                    }
                    pendingTransactions.push(principalTransaction)
                })
                investors.forEach(e => {
                    interestPmt = interest_pmt * e.pct,
                        fee.forEach(f => {
                            feeCharge = interestPmt * f.pct
                            creditTransaction = {
                                _loan: mongoose.Types.ObjectId(e._loan),
                                _investor: mongoose.Types.ObjectId(e._investor),
                                _loanSchedule: mongoose.Types.ObjectId(id),
                                date: new Date(),
                                cashAccount: cashAccount,
                                concept: "MANAGEMENT_FEE_COST",
                                amount: feeCharge
                            }
                            pendingTransactions.push(creditTransaction)
                            debitTransaction = {
                                _loan: mongoose.Types.ObjectId(e._loan),
                                _investor: mongoose.Types.ObjectId(f.admin),
                                _loanSchedule: mongoose.Types.ObjectId(id),
                                date: new Date(),
                                cashAccount: cashAccount,
                                concept: "MANAGEMENT_FEE_INCOME",
                                amount: feeCharge
                            }
                            pendingTransactions.push(debitTransaction)
                        })
                })
                Transaction.insertMany(pendingTransactions)
                return investors
            })
            .then(investors => res.status(200).json(investors))
            .catch(e => next(e))
    })

    // CRUD: DELETE
    router.delete('/:id', (req, res, next) => {
        const {
            id
        } = req.params;
        Model.findByIdAndRemove(id)
            .then(obj => {
                if (obj) {
                    res.status(200).json({
                        status: `Removed from db`
                    });
                } else {
                    throw new Error("Not existing ID");
                }
            })
            .catch(e => next(e))
    })

    router.use((err, req, res, next) => {
        res.status(500).json({
            error: true,
            message: err.message
        });
    })

    return router;
}



module.exports = simpleCrud;