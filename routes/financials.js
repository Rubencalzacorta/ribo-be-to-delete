const express = require('express');
const _ = require('lodash')
const {
    cashAvailable,
    currencyCashFlow
} = require('./helpers/financialsAggregates')
const LoanSchedule = require('../models/LoanSchedule')


const companyCrud = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }

    router.get('/cash-available', async (req, res, next) => {
        let usCashAccounts = ['GFUS', 'GCUS']
        let peruCashAccounts = ['REMPERU', 'PLPERU']
        let rdCashAccounts = ['GCDR']

        usAccounts = Model.aggregate(cashAvailable(usCashAccounts))
        peruAccounts = Model.aggregate(cashAvailable(peruCashAccounts))
        rdAccounts = Model.aggregate(cashAvailable(rdCashAccounts))

        Promise.all([usAccounts, peruAccounts, rdAccounts])
            .then(objList => res.status(200).json({
                'US': parseFloat(objList[0][0].total),
                'PERU': parseFloat(objList[1][0].total),
                'RD:': parseFloat(objList[2][0].total)
            }))
            .catch(e => next(e))
    })

    router.get('/cash-flow', async (req, res, next) => {
        usdCF = LoanSchedule.aggregate(currencyCashFlow('USD', new Date()))
        domCF = LoanSchedule.aggregate(currencyCashFlow('DOP', new Date()))
        console.log(LoanSchedule)
        Promise.all([usdCF, domCF]).then(objList => res.status(200).json({
                'US': objList[0],
                'RD': objList[1]
            }))
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



    // CRUD: CREATE
    router.post('/', (req, res, next) => {
        const object = _.pickBy(req.body, (e, k) => paths.includes(k));
        Model.create(object)
            .then(obj => res.status(200).json({
                status: "success",
                response: obj
            }))
            .catch(e => console.log(e))
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



module.exports = companyCrud;