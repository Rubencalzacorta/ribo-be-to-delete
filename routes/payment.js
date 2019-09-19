const express = require('express');
const _ = require('lodash');
const mongoose = require('mongoose')
const moment = require('moment')
const LoanSchedule = require('../models/LoanSchedule')
const Investment = require('../models/Investment')
const Transaction = require('../models/Transaction')
const uploadCloud = require('../config/cloudinary')

const paymentCrud = (Model, extensionFn) => {

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

    // CRUD: CREATE
    router.post('/loan-schedule/:id', (req, res, next) => {
        let {
            id
        } = req.params


        const object = _.pickBy(req.body, (e, k) => paths.includes(k));
        // console.log(object)

        Model.create(object)
            .then(obj => res.status(200).json({
                status: "success",
                response: obj
            }))
            .catch(e => next(e))

        // LoanSchedule.findById(object._loanSchedule)
        //     .then(loanSchedule => {
        //         res.status(200).json({
        //             status: "success",
        //             response: {
        //                 payment: object,
        //                 loanSchedule: loanSchedule
        //             }
        //         })
        //     })
        //     .catch(e => next(e))


        // ).catch(e => next(e))
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



    // CRUD: UPDATE

    router.patch('/:id', (req, res, next) => {
        const {
            id
        } = req.params;
        updates = req.body

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



module.exports = paymentCrud;