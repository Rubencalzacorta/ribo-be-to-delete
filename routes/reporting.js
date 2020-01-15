const express = require('express');
const {
    collectionCategorization
} = require('./helpers/reportingAggregates')

const reporting = (Model, extensionFn) => {

    let router = express.Router();

    let notUsedPaths = ['_id', 'updated_at', 'created_at', '__v'];
    let paths = Object.keys(Model.schema.paths).filter(e => !notUsedPaths.includes(e));

    if (extensionFn) {
        router = extensionFn(router);
    }

    router.get('/collection', async (req, res, next) => {

        console.log('aca')
        result = await collectionCategorization(req.user.location)
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
                        "name": "0 a 3 días",
                        "children": e.c030
                    },
                    {
                        "name": "3 a 30 días",
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
                    },
                ]
            })
        })

        res.status(200).json(structuredData)

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