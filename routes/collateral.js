const express = require('express');
const _ = require('lodash');

const collateralCrud = (Model, extensionFn) => {

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

    router.get('/:id', (req, res, next) => {

        Model.findById(req.params.id)
            .then(obj => res.status(200).json(obj))
            .catch(e => next(e))
    })

    // CRUD: CREATE

    router.post('/', (req, res, next) => {

        const object = _.pickBy(req.body, (e, k) => paths.includes(k));

        console.log(`Creating new collateral for loan ${req.body.loanId}`)

        Model.create(object)
            .then(obj => {
                return res.status(200).json({
                    status: "success",
                    response: obj
                })
            })
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

    router.patch('/status/:id', (req, res, next) => {
        const {
            id
        } = req.params;

        updates = {
            $push: {
                currentStatus: req.body
            }
        }

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



module.exports = collateralCrud;