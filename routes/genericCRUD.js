const express = require('express');
const _ = require('lodash');
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

    //keep and refactor functions
    router.get('/search/:query', (req, res, next) => {
        let country = req.user.location
        let {
            query
        } = req.params
        querym = (country === 'GLOBAL') ? {
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

    //keep
    router.get('/:id', (req, res, next) => {
        let {
            id
        } = req.params
        Model.findById(id)
            .then(obj => res.status(200).json(obj))
            .catch(e => next(e))
    })

    //keep
    router.get('/detail/:id', (req, res, next) => {
        let {
            id
        } = req.params
        Model.findById(id)
            .populate('loans')
            .then(obj => res.status(200).json(obj))
            .catch(e => next(e))
    })


    // CRUD: CREATE
    //keep
    router.post('/', (req, res, next) => {
        const object = _.pickBy(req.body, (e, k) => paths.includes(k));
        Model.create(object)
            .then(obj => res.status(200).json({
                status: "success",
                response: obj
            }))
            .catch(e => next(e))
    })

    //keep
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

    // CRUD: UPDATE

    //keep
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