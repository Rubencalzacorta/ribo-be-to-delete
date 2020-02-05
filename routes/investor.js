const express = require('express');
const _ = require('lodash')
const {
    User,
    ManagementFee,
} = require('../models')
let {
    investorCashDetails,
    investorInvestmentDetails,
    investorPLDetails,
    investorCashMovements,
    investorInvestmentsSummary,
    investorInvestmentsDetails,
} = require('./helpers/investorAggregates')


const investorCrud = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }


    router.get('/list', (req, res, next) => {

        if (req.user.location === 'GLOBAL') {
            location = Model.schema.path('location').enumValues
        } else {
            location = [req.user.location]
        }

        Model.find({
                investor: true,
                location: {
                    $in: location
                }
            })
            .then(objList => res.status(200).json(objList))
            .catch(e => next(e))
    })

    router.get('/holding-account/list', (req, res, next) => {

        try {
            if (req.user.location === 'GLOBAL') {
                Model.find({
                        firstName: 'Ribo Capital'
                    })
                    .then(objList => res.status(200).json(objList))
            } else {
                Model.find({
                        firstName: 'Ribo Capital',
                        location: req.user.location
                    })
                    .then(objList => res.status(200).json(objList))
            }
        } catch (e) {
            next(e)
        }
    })

    router.post('/', (req, res, next) => {
        const object = _.pickBy(req.body, (e, k) => paths.includes(k));
        Model.create(object)
            .then(obj => res.status(200).json({
                status: "success",
                response: obj
            }))
            .catch(e => next(e))
    })

    router.get('/detail/investment-preference/:id', (req, res, next) => {
        let {
            id
        } = req.params
        Model.findById(id).select({
                isAutoInvesting: true,
                investorType: true
            })
            .then(obj => res.status(200).json(obj))
            .catch(e => next(e))
    })

    router.post('/detail/investment-preference/:id', (req, res, next) => {
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
                        status: 'failure'

                    })
                }

                if (updatedUser) {
                    res.status(200).json({
                        status: "success",
                        isAutoInvesting: updatedUser.isAutoInvesting,
                    })
                }
            });
        });
    })

    router.post('/detail/management-fee', async (req, res, next) => {
        let {
            investorId,
            managementAccountId,
            pct
        } = req.body

        let MF = await ManagementFee.findOne({
            _investor: investorId,
            _managementAccount: managementAccountId
        })

        try {
            if (MF) {
                throw new Error('Relationship already exist')
            } else {
                ManagementFee.create({
                    _investor: investorId,
                    _managementAccount: managementAccountId,
                    pct: pct
                }).then(async FeeStructure => {
                    let UF = await User.findById(investorId)
                    await UF.managementFee.push(FeeStructure._id)
                    return UF.save()
                }).then(user => {
                    res.status(200).json({
                        status: "success",
                        data: user.managementFee
                    })
                }).catch(e => next(e))
            }
        } catch (e) {
            next(e)
        }
    })

    router.put('/detail/management-fee', async (req, res, next) => {
        let {
            managementFeeId,
            pct
        } = req.body

        let MF = await ManagementFee.findById(managementFeeId)

        try {
            if (!MF) {
                throw new Error('ManagementFee does not exist')
            } else {
                ManagementFee.findByIdAndUpdate(managementFeeId, {
                    pct: pct
                }, {
                    new: true
                }).then(update => {
                    res.status(200).json({
                        status: "success",
                        data: update
                    })
                }).catch(e => next(e))
            }
        } catch (e) {
            next(e)
        }
    })

    router.get('/detail/management-fee/:investorId', async (req, res, next) => {
        let {
            investorId,
        } = req.params

        try {

            user = await User.findById(investorId).populate({
                path: 'managementFee',
                populate: {
                    path: '_managementAccount'
                }
            })
            res.status(200).json({
                status: "success",
                data: user.managementFee
            })

        } catch (e) {
            next(e)
        }
    })

    router.put('/detail/investment-preference/investor-type', async (req, res, next) => {
        let {
            investorId,
            investorType
        } = req.body

        let INV = await User.findOne({
            _id: investorId,
            investor: true
        })

        try {
            if (!INV) {
                throw new Error('Theres no investor active investor under this ID')
            } else {
                INV.investorType = investorType
                INV.save().then(updatedUser => {
                    res.status(200).json({
                        status: "success",
                        data: updatedUser
                    });
                })
            }
        } catch (e) {
            next(e)
        }
    });

    router.delete('/:id', (req, res, next) => {

        Model.findByIdAndRemove(req.params.id)
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

    router.get('/profile/cash-available/:id', async (req, res, next) => {

        investorCashDetails(req.params.id)
            .then(obj => {
                res.status(200).json(obj)
            })
            .catch(e => next(e))
    })

    router.get('/profile/investment-details/:id', async (req, res, next) => {

        investorInvestmentDetails(req.params.id)
            .then(obj => {
                res.status(200).json(obj)
            })
            .catch(e => next(e))
    })

    router.get('/profile/profit-and-loss/:id', async (req, res, next) => {

        investorPLDetails(req.params.id)
            .then(obj => {
                res.status(200).json(obj)
            })
            .catch(e => next(e))
    })

    router.get('/profile/cash-movements/:id', async (req, res, next) => {

        investorCashMovements(req.params.id)
            .then(obj => {
                res.status(200).json(obj)
            })
            .catch(e => next(e))
    })

    router.get('/investment-summary/:id', async (req, res, next) => {

        investorInvestmentsSummary(req.params.id)
            .then(obj => {
                res.status(200).json(obj)
            })
            .catch(e => next(e))

    });

    router.get('/investment-details/:id', (req, res, next) => {

        investorInvestmentsDetails(req.params.id)
            .then(result =>
                res.status(200).json(result))
            .catch(e => {
                return next(e)
            })

    })

    router.use((err, req, res, next) => {
        res.status(500).json({
            error: true,
            message: err.message
        });
    })

    return router;
}



module.exports = investorCrud;