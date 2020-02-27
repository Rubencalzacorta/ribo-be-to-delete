const express = require('express');

const CommentCrud = (Model, extensionFn) => {

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

    router.get('/:loanId', (req, res, next) => {
        Model.find({
                _loan: req.params.loanId
            })
            .then(objList => res.status(200).json(objList))
            .catch(e => next(e))
    })

    router.get('/:commentId', (req, res, next) => {

        Model.findById(req.params.commentId)
            .then(objList => res.status(200).json(objList))
            .catch(e => next(e))

    })

    router.post('/', (req, res, next) => {
        console.log(`Creating comment for loan ${req.body._loan}`)

        let newComment = new Model(object)
        newComment.save()
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

    // CRUD: DELETE
    router.delete('/:commentId', (req, res, next) => {

        const {
            commentId
        } = req.body;

        Model.delete({
                _id: commentId
            }).then(obj => {
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
        console.log(err.message)
        res.status(500).json({
            error: true,
            message: err.message
        });
    })

    return router;
}

module.exports = CommentCrud;