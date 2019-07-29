const express = require('express');
const _ = require('lodash')
const {
    cashAvailable,
    countryCashFlow,
    countryAllocation
} = require('./helpers/financialsAggregates')
const LoanSchedule = require('../models/LoanSchedule')
const User = require('../models/User')
const Loan = require('../models/Loan')
const {
    getCountryAccounts,
    getCountry
} = require('./helpers/financialHelper')


const companyCrud = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }

    router.get('/cash-available/accounts/:country', async (req, res, next) => {
        let {
            country
        } = req.params

        let accounts = getCountryAccounts(country)

        Model.aggregate(cashAvailable(accounts))
            .then(objList =>
                res.status(200).json(
                    objList
                )
            )
            .catch(e => next(e))
    })

    router.get('/allocations/:country', async (req, res, next) => {
        let {
            country
        } = req.params

        let countries = getCountry(country)
        Loan.aggregate(countryAllocation(countries))
            .then(console.log)

    })

    router.get('/general/stats/:country', async (req, res, next) => {
        let {
            country
        } = req.params

        let countries = getCountry(country)
        Loan.aggregate(generalStats(countries))
            .then(objList =>
                res.status(200).json(
                    objList
                )
            )
            .catch(e => next(e))
    })



    router.get('/cashflow/:country', async (req, res, next) => {
        let countries = User.schema.path('country').enumValues;
        let {
            country
        } = req.params

        cashFlows = []

        if (country !== 'WORLD') {
            let countryCF = await LoanSchedule.aggregate(countryCashFlow(country))
            cashFlows = [{
                [country]: countryCF
            }]
        } else {
            cashFlows = countries.map(async (country) => {
                return {
                    [country]: await LoanSchedule.aggregate(countryCashFlow(country))
                }

                // let countryCF = await LoanSchedule.aggregate(countryCashFlow(country))
            })
        }

        // usdCF = LoanSchedule.aggregate(currencyCashFlow('USD', new Date()))
        // domCF = LoanSchedule.aggregate(currencyCashFlow('DOP', new Date()))
        // console.log(LoanSchedule)
        Promise.all(cashFlows)
            .then(objList => res.status(200).json(objList))
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