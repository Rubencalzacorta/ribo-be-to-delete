const express = require('express');
const _ = require('lodash');
const {
    paymentsByCountry
} = require('./helpers/paymentAggregates')

const paymentCrud = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }

    router.get('/', (req, res, next) => {
        paymentsByCountry(req.user.location)
            .then(objList => res.status(200).json(objList))
            .catch(e => next(e))
    })


    // CRUD: CREATE
    router.post('/installment/:id', (req, res, next) => {
        let {
            id
        } = req.params

        let body = {
            ...req.body,
            paymentType: "REGULAR"
        }

        const object = _.pickBy(body, (e, k) => paths.includes(k));
        console.group('Payment placer details')
        Model.create(object)
            .then(obj => {
                return res.status(200).json({
                    status: "success",
                    response: obj
                })
            })
            .catch(e => next(e))
    })




    router.post('/prepay-loan/installment/:id', (req, res, next) => {
        let {
            id
        } = req.params

        let body = {
            ...req.body,
            paymentType: "FULL"
        }

        const object = _.pickBy(body, (e, k) => paths.includes(k));
        console.group('Payment placer details')
        Model.create(object)
            .then(obj => {
                return res.status(200).json({
                    status: "success",
                    response: obj
                })
            })
            .catch(e => next(e))
    })

    router.post('/bulk-payment', (req, res, next) => {
        console.log(req.body)
        let {
            bulkPayment,
            paymentDate,
            cashAccount
        } = req.body
        payments = bulkPayment.map(async (e) => {
            return await Model.create({
                _loan: e._loan,
                _loanSchedule: e._loanSchedule,
                date_pmt: paymentDate,
                amount: e.amount,
                cashAccount: cashAccount
            })
        })

        Promise.all(payments)
            .then((payments_r) => {
                res.status(200).json({
                    status: "success",
                    response: payments_r
                })
            }).catch(e => next(e))

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

    router.delete('/installment/:id', (req, res, next) => {
        const {
            id
        } = req.params;

        Model.findById(id)
            .then(obj => obj.remove())
            .then(obj => {
                if (obj) {
                    res.status(200).json({
                        status: `Removed from db`,
                        obj: obj
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