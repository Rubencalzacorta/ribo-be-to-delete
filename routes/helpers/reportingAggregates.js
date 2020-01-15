const LoanSchedule = require('../../models/LoanSchedule')

module.exports.collectionCategorization = async (country) => {
    let today = new Date()
    if (country === 'WORLD') {
        location = ['PERU', 'VENEZUELA', 'DOMINICAN_REPUBLIC']
    } else {
        location = [country]
    }


    return await LoanSchedule.aggregate([{
        '$match': {
            'status': {
                '$nin': [
                    'CLOSED', 'DISBURSTMENT', 'PAID'
                ]
            }
        }
    }, {
        '$sort': {
            'date': 1
        }
    }, {
        '$group': {
            '_id': '$_loan',
            'date': {
                '$first': '$date'
            },
            'status': {
                '$first': '$status'
            },
            'interest': {
                '$first': '$interest'
            },
            'principal': {
                '$first': '$principal'
            },
            'currency': {
                '$first': '$currency'
            },
            'payment': {
                '$first': '$payment'
            },
            'balance': {
                '$first': '$balance'
            },
            'interest_pmt': {
                '$first': '$interest_pmt'
            },
            'principal_pmt': {
                '$first': '$principal_pmt'
            }
        }
    }, {
        '$project': {
            'date': 1,
            'dayDiff': {
                '$divide': [{
                    '$subtract': [
                        today, '$date'
                    ]
                }, 86400000]
            },
            'interest': 1,
            'principal': 1,
            'payment': 1,
            '_id': 1,
            'status': 1,
            'currency': 1,
            'balance': 1,
            'interest_pmt': 1,
            'principal_pmt': 1
        }
    }, {
        '$project': {
            'periodClassification': {
                '$cond': [{
                    '$and': [{
                        '$gte': [
                            '$dayDiff', 0
                        ]
                    }, {
                        '$lt': [
                            '$dayDiff', 3
                        ]
                    }]
                }, '0-3', {
                    '$cond': [{
                        '$and': [{
                            '$gte': [
                                '$dayDiff', 3
                            ]
                        }, {
                            '$lt': [
                                '$dayDiff', 30
                            ]
                        }]
                    }, '3-30', {
                        '$cond': [{
                            '$and': [{
                                '$gte': [
                                    '$dayDiff', 30
                                ]
                            }, {
                                '$lt': [
                                    '$dayDiff', 60
                                ]
                            }]
                        }, '30-60', {
                            '$cond': [{
                                '$and': [{
                                    '$gte': [
                                        '$dayDiff', 60
                                    ]
                                }, {
                                    '$lt': [
                                        '$dayDiff', 90
                                    ]
                                }]
                            }, '60-90', {
                                '$cond': [{
                                    '$and': [{
                                        '$gte': [
                                            '$dayDiff', 90
                                        ]
                                    }]
                                }, '+90', {
                                    '$cond': [{
                                        '$and': [{
                                            '$gte': [
                                                '$dayDiff', -30
                                            ]
                                        }, {
                                            '$lt': [
                                                '$dayDiff', 0
                                            ]
                                        }]
                                    }, '0', '-0']
                                }]
                            }]
                        }]
                    }]
                }]
            },
            'date': 1,
            'dayDiff': 1,
            'interest': 1,
            'principal': 1,
            'payment': 1,
            '_id': 1,
            'status': 1,
            'currency': 1,
            'interest_pmt': 1,
            'principal_pmt': 1
        }
    }, {
        '$match': {
            'periodClassification': {
                '$ne': '-0'
            }
        }
    }, {
        '$lookup': {
            'from': 'loans',
            'localField': '_id',
            'foreignField': '_id',
            'as': 'loan'
        }
    }, {
        '$unwind': {
            'path': '$loan'
        }
    }, {
        '$lookup': {
            'from': 'users',
            'localField': 'loan._borrower',
            'foreignField': '_id',
            'as': 'borrower'
        }
    }, {
        '$unwind': {
            'path': '$borrower'
        }
    }, {
        '$project': {
            'periodClassification': 1,
            'remainingCapital': {
                '$subtract': [
                    '$loan.capital', '$loan.totalPaid'
                ]
            },
            'name': {
                '$concat': [
                    '$borrower.firstName', ' ', '$borrower.lastName'
                ]
            },
            'country': '$borrower.country',
            'date': 1,
            'dayDiff': 1,
            '_id': 1,
            'value': {
                '$cond': {
                    'if': {
                        '$eq': [
                            '$borrower.country', 'DOMINICAN_REPUBLIC'
                        ]
                    },
                    'then': {
                        '$divide': [{
                            '$subtract': [{
                                '$add': [
                                    '$interest', '$principal'
                                ]
                            }, {
                                '$add': [
                                    '$interest_pmt', '$principal_pmt'
                                ]
                            }]
                        }, 51]
                    },
                    'else': {
                        '$subtract': [{
                            '$add': [
                                '$interest', '$principal'
                            ]
                        }, {
                            '$add': [
                                '$interest_pmt', '$principal_pmt'
                            ]
                        }]
                    }
                }
            },
            'status': 1,
            'currency': 1
        }
    }, {
        '$match': {
            'country': {
                '$in': location
            }
        }
    }, {
        '$group': {
            '_id': {
                'country': '$country'
            },
            'c0': {
                '$push': {
                    '$cond': [{
                        '$eq': [
                            '$periodClassification', '0'
                        ]
                    }, '$$ROOT', '$noval']
                }
            },
            'c030': {
                '$push': {
                    '$cond': [{
                        '$eq': [
                            '$periodClassification', '0-3'
                        ]
                    }, '$$ROOT', '$noval']
                }
            },
            'c330': {
                '$push': {
                    '$cond': [{
                        '$eq': [
                            '$periodClassification', '3-30'
                        ]
                    }, '$$ROOT', '$noval']
                }
            },
            'c3060': {
                '$push': {
                    '$cond': [{
                        '$eq': [
                            '$periodClassification', '30-60'
                        ]
                    }, '$$ROOT', '$noval']
                }
            },
            'c6090': {
                '$push': {
                    '$cond': [{
                        '$eq': [
                            '$periodClassification', '60-90'
                        ]
                    }, '$$ROOT', '$noval']
                }
            },
            'c90': {
                '$push': {
                    '$cond': [{
                        '$eq': [
                            '$periodClassification', '+90'
                        ]
                    }, '$$ROOT', '$noval']
                }
            }
        }
    }])
}