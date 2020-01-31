const express = require('express');
const {
    collectionCategorization,
    collectionRaw,
    pAndLReport
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
        res.status(200).json(structuredData)

    })




    router.get('/p-and-l', async (req, res, next) => {
        try {
            pAndL = await pAndLReport(req.query)
            res.status(200).json(pAndL)
        } catch (e) {
            next(e)
        }
    })

    router.use((err, req, res, next) => {
        console.log(err.message)
        res.status(500).json({
            error: true,
            message: err.message
        });
    })

    return router;
}



module.exports = reporting;