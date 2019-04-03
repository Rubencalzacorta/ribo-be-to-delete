    // router.get('/invavbl', (req,res,next) => {
    //     console.log("aqui")
        // Model.aggregate([
        //         {
        //           '$project': {
        //             '_investor': 1, 
        //             'total': {
        //               '$subtract': [
        //                 '$debit', '$credit'
        //               ]
        //             }
        //           }
        //         }, {
        //           '$group': {
        //             '_id': '$_investor', 
        //             'accumTotal': {
        //               '$sum': '$total'
        //             }
        //           }
        //         }, {
        //           '$lookup': {
        //             'from': 'investors', 
        //             'localField': '_id', 
        //             'foreignField': '_id', 
        //             'as': 'investor'
        //           }
        //         }
        //   ])
        //   .then(console.log("addddd"))
        //   .then( obj => res.status(200).json(obj))
        //   .catch(e => next(e))
    //     res.status(200)
    // })