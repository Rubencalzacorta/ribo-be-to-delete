const Payment = require('../../models/Payment')

module.exports.paymentsByCountry = async (adminCountry) => {

    let countries = []
    if (adminCountry === 'GLOBAL' || !adminCountry) {
        countries = ['DOMINICAN_REPUBLIC', 'USA', 'PERU', 'VENEZUELA']
    } else if (adminCountry !== 'GLOBAL') {
        countries = [adminCountry]
    }

    return await Payment.aggregate([{
        '$lookup': {
            'from': 'loans',
            'localField': '_loan',
            'foreignField': '_id',
            'as': 'l'
        }
    }, {
        '$unwind': {
            'path': '$l'
        }
    }, {
        '$lookup': {
            'from': 'users',
            'localField': 'l._borrower',
            'foreignField': '_id',
            'as': 'b'
        }
    }, {
        '$unwind': {
            'path': '$b'
        }
    }, {
        '$match': {
            'b.country': {
                '$in': countries
            }
        }
    }, {
        '$project': {
            '_loan': 1,
            '_id': 1,
            'date_pmt': {
                '$dateToString': {
                    'format': "%Y-%m-%d",
                    'date': "$date_pmt"
                }
            },
            'amount': 1,
            'paymentType': 1,
            'created_at': {
                '$dateToString': {
                    'format': "%Y-%m-%d",
                    'date': "$created_at"
                }
            },
            'borrower': {
                '$concat': [
                    '$b.firstName', ' ', '$b.lastName'
                ]
            },
            'cashAccount': 1
        }
    }, {
        '$sort': {
            'date_pmt': -1
        }
    }])
}