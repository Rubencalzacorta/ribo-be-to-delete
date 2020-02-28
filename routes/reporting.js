const express = require('express');
const {
    collectionCategorization,
    collectionRaw,
    pAndLReport,
    investorMonthlyReport,
    investorMontlyInvestments
} = require('./helpers/reportingAggregates')
const moment = require('moment')

const reporting = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }

    router.get('/collection', async (req, res, next) => {
        result = await collectionRaw(req.user.location, true)
        let structuredData = {
            "name": "COBRANZA",
            "children": []
        }
        result.forEach(e => {
            structuredData.children.push({
                "name": e._id.country,
                "children": [{
                    "name": "Cobranza",
                    "children": e.paymentsDue
                }]
            })
        })
        res.status(200).json(structuredData)
    })

    router.get('/collection-days', async (req, res, next) => {

        result = await collectionCategorization(req.user.location, true)
        let structuredData = {
            "name": "COBRANZA",
            "children": []
        }

        result.forEach(e => {
            structuredData.children.push({
                "name": e._id.country,
                "children": [{
                        "name": "Por Vencer",
                        "children": e.c0
                    },
                    {
                        "name": "0 a 7 días",
                        "children": e.c030
                    },
                    {
                        "name": "7 a 30 días",
                        "children": e.c330
                    },
                    {
                        "name": "30 y 60 días",
                        "children": e.c3060
                    },
                    {
                        "name": "60 y 90 días",
                        "children": e.c6090
                    },
                    {
                        "name": "90 días",
                        "children": e.c90
                    }
                ]
            })
        })
        console.log(structuredData)
        res.status(200).json(structuredData)

    })




    router.get('/p-and-l', async (req, res, next) => {
        let {
            query
        } = req

        try {
            pAndL = await pAndLReport(query)
            res.status(200).json(pAndL)
        } catch (e) {
            next(e)
        }
    })

    router.get('/investor/investments/:id', async (req, res, next) => {
        try {
            IMI = await investorMontlyInvestments(req.params.id)
            res.status(200).json(IMI)
        } catch (e) {
            next(e)
        }
    })

    router.get('/investor/report/:id', async (req, res, next) => {
        try {
            IMR = await investorMonthlyReport(req.params.id)
            res.status(200).json(IMR)
        } catch (e) {
            next(e)
        }
    })

    router.use((err, req, res, next) => {
        res.status(500).json({
            error: true,
            message: err.message
        });
    })

    return router;
}



module.exports = reporting;