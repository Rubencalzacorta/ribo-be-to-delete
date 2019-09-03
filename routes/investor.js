const express = require('express');
const _ = require('lodash')
const LoanSchedule = require('../models/LoanSchedule')
const User = require('../models/User')
const Loan = require('../models/Loan')
const ManagementFee = require('../models/ManagementFee')
const Transaction = require('../models/Transaction')
const Investment = require('../models/Investment')



const investorCrud = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }

    router.get('/list', (req, res, next) => {
        Model.find({
                investor: true
            })
            .then(objList => res.status(200).json(objList))
            .catch(e => next(e))
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


    router.get('/detail/investmentStatus/:id', (req, res, next) => {
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

    router.post('/detail/investmentStatus/:id', (req, res, next) => {
        let {
            id
        } = req.params
        console.log(id, 'aqui')
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


    router.post('/management-fee', async (req, res, next) => {
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

    router.put('/management-fee', async (req, res, next) => {
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

    router.get('/management-fee/:investorId', async (req, res, next) => {
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


    router.delete('/management-fee/:managementFeeId', async (req, res, next) => {
        let {
            managementFeeId,
        } = req.params

        let MF = await ManagementFee.findById(managementFeeId)
        console.log(MF)
        try {
            if (!MF) {
                throw new Error('ManagementFee does not exist')
            } else {
                ManagementFee.findByIdAndDelete(managementFeeId)
                    .then(async deletedItem => {
                        let UF = await User.findById(deletedItem._investor)
                        UF.managementFee.pull(deletedItem._id)
                        UF.save()
                    })
                    .then(resp => {
                        res.status(200).json({
                            status: "success",
                            data: resp
                        })
                    }).catch(e => next(e))
            }
        } catch (e) {
            next(e)
        }
    })

    router.put('/type', async (req, res, next) => {
        let {
            investorId,
            investorType
        } = req.body
        console.log(req.body)
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

    router.use((err, req, res, next) => {
        res.status(500).json({
            error: true,
            message: err.message
        });
    })

    return router;
}



module.exports = investorCrud;