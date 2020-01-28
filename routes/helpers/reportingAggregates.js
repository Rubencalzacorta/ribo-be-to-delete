const LoanSchedule = require('../../models/LoanSchedule')
const Transaction = require('../../models/Transaction')
const moment = require('moment')
var ObjectID = require('mongodb').ObjectID
const mongoose = require('mongoose')
const _ = require('lodash')
const util = require('util')

module.exports.collectionCategorization = async (country, rateAdjustment) => {
    let today = new Date()
    let today2 = new Date()
    var newDate = new Date(today.setDate(today.getDate() + 15));
    if (country === 'WORLD') {
        location = ['PERU', 'VENEZUELA', 'DOMINICAN_REPUBLIC']
    } else {
        location = [country]
    }

    if (rateAdjustment) {
        rate = 51
    } else {
        rate = 1
    }


    return await LoanSchedule.aggregate([{
        '$match': {
            'status': {
                '$nin': [
                    'CLOSED', 'DISBURSTMENT', 'PAID', 'RESTRUCTURED'
                ]
            },
            'date': {
                '$lte': newDate
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
            'oldest_installment': {
                '$first': '$_id'
            },
            'oldest_payment': {
                '$first': '$payment'
            },
            'interest': {
                '$sum': '$interest'
            },
            'principal': {
                '$sum': '$principal'
            },
            'number_unpaid': {
                '$sum': 1
            },
            'currency': {
                '$first': '$currency'
            },
            'payment': {
                '$sum': '$payment'
            },
            'interest_pmt': {
                '$sum': '$interest_pmt'
            },
            'principal_pmt': {
                '$sum': '$principal_pmt'
            }
        }
    }, {
        '$project': {
            'date': 1,
            'dayDiff': {
                '$divide': [{
                    '$subtract': [
                        today2, '$date'
                    ]
                }, 86400000]
            },
            'interest': 1,
            'principal': 1,
            'oldest_installment': 1,
            'oldest_payment': 1,
            'payment': 1,
            'number_unpaid': 1,
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
                        '$lte': [
                            '$dayDiff', 7
                        ]
                    }]
                }, '0-3', {
                    '$cond': [{
                        '$and': [{
                            '$gte': [
                                '$dayDiff', 8
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
                                                '$dayDiff', -15
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
            'oldest_installment': 1,
            'oldest_payment': 1,
            'number_unpaid': 1,
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
                        }, rate]
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
            'currency': 1,
            'oldest_installment': 1,
            'oldest_payment': 1,
            'number_unpaid': 1,
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

const accountFilter = (accounts, accountConcept) => {
    let account = accounts.filter(e => {

        return e.concept == accountConcept
    })[0]

    if (account != undefined && 'balance' in account) {
        return account.balance
    } else {
        return 0
    }
}

const getDateFromWeek = function (week, year) {
    return moment().day("Monday").year(year).week(week).toDate();
};

const calcDate = (query, week, month, year) => {
    if (query.periodicity == 'weekly') {
        return getDateFromWeek(week, year)
    } else {
        return moment(year + '/' + month + '/' + 01, 'YYYY/MM/DD').format('YYYY-MM-DD')
    }
}

module.exports.pAndLReport = async (query) => {

    pAndL = await pAndLData(query)
    data = {}
    a = pAndL.map(e => {
        data = {}
        let {
            year,
            month,
            week,
            accounts
        } = e

        data['Fecha'] = calcDate(query, week, month, year)

        data['Fee de Gestion Financiera'] = accountFilter(accounts, 'MANAGEMENT_FEE_INCOME')
        data['Intereses por Gestion Financiera'] = accountFilter(accounts, 'MANAGEMENT_INTEREST_INCOME')
        data['Fee'] = accountFilter(accounts, 'FEE')
        data['Ingresos Financieros'] = data['Fee de Gestion Financiera'] + data['Intereses por Gestion Financiera'] + data['Fee']

        data['Costo por Seguro'] = accountFilter(accounts, 'INSURANCE_COST')
        data['Costo por Intereses'] = accountFilter(accounts, 'INTEREST_COST')
        data['Costo por comisiones'] = accountFilter(accounts, 'COMMISSION_COST')
        data['Costos Financieros'] = data['Costo por Seguro'] + data['Costo por Intereses'] + data['Costo por comisiones']

        data['Margen Financiero Bruto'] = data['Ingresos Financieros'] + data['Costos Financieros']

        data['Fees Bancarios'] = accountFilter(accounts, 'BANKING_FEE')
        data['Comisiones por Transferencias'] = accountFilter(accounts, 'BANKING_TRANSFER_FEE')
        data['Originación Transporte'] = accountFilter(accounts, 'COST_ORIGINATION_LEGAL')
        data['Originación Legal'] = accountFilter(accounts, 'COST_ORIGINATION_TRANSPORT')
        data['Originación Gastos'] = accountFilter(accounts, 'COST_ORIGINATION_EXPENSES')
        data['Originación Sentinel'] = accountFilter(accounts, 'COST_ORIGINATION_SENTINEL')
        data['Servicio Deuda Transporte'] = accountFilter(accounts, 'COST_SERVICING_TRANSPORT')
        data['Servicio Deuda Legal'] = accountFilter(accounts, 'COST_SERVICING_LEGAL')
        data['Servicio Deuda Gastos'] = accountFilter(accounts, 'COST_SERVICING_EXPENSES')
        data['Gastos por Servicios Financieros'] =
            data['Fees Bancarios'] +
            data['Comisiones por Transferencias'] +
            data['Originación Transporte'] +
            data['Originación Legal'] +
            data['Originación Gastos'] +
            data['Originación Sentinel'] +
            data['Servicio Deuda Transporte'] +
            data['Servicio Deuda Legal'] +
            data['Servicio Deuda Gastos']

        data['Margen Operativo'] = data['Margen Financiero Bruto'] + data['Gastos por Servicios Financieros']

        data['Costos Sin Clasificacion'] = accountFilter(accounts, 'UNCLASSIFIED_COST')
        data['Costos'] = accountFilter(accounts, 'COST')
        data['Salarios'] = accountFilter(accounts, 'SALARY')
        data['Contabilidad'] = accountFilter(accounts, 'SG&A_ACCOUNTING')
        data['Marketing'] = accountFilter(accounts, 'SG&A_MARKETING')
        data['Servicios Tecnologicos'] = accountFilter(accounts, 'SG&A_TECH_SERVICES')
        data['Legal'] = accountFilter(accounts, 'SG&A_LEGAL')
        data['Mensajeria'] = accountFilter(accounts, 'SG&A_MAILING')
        data['Miscelaneo'] = accountFilter(accounts, 'SG&A_MISCELLANEOUS')
        data['Renta'] = accountFilter(accounts, 'SG&A_OFFICE_RENT')
        data['Impresiones'] = accountFilter(accounts, 'SG&A_OFFICE_PRINT')
        data['Almacenamiento'] = accountFilter(accounts, 'SG&A_OFFICE_STORAGE')
        data['Viaticos'] = accountFilter(accounts, 'TRAVEL_EXPENSES')
        data['Transporte'] = accountFilter(accounts, 'TRANSPORT')

        data['Gasto General Administrativo y Servicios'] =
            data['Costos Sin Clasificacion'] +
            data['Costos'] +
            data['Salarios'] +
            data['Contabilidad'] +
            data['Marketing'] +
            data['Servicios Tecnologicos'] +
            data['Legal'] +
            data['Mensajeria'] +
            data['Miscelaneo'] +
            data['Renta'] +
            data['Impresiones'] +
            data['Almacenamiento'] +
            data['Viaticos'] +
            data['Transporte']

        data['Resultado Operativo'] = data['Margen Operativo'] + data['Gasto General Administrativo y Servicios']
        data['Dividendos'] = accountFilter(accounts, 'DIVIDENDS')

        return data
    })

    aSorted = a.sort((i, j) => new Date(i.Fecha) - new Date(j.Fecha))
    return aSorted

}


const pAndLData = async (query) => {

    const maxStartDate = new Date()
    maxStartDate.setDate(maxStartDate.getDate() - 7);

    if (query.startDate > moment(maxStartDate).format('YYYY-MM-DD')) {
        query.startDate = moment(maxStartDate).format('YYYY-MM-DD')
    }
    return Transaction.aggregate(periodSelector(query))
}

const periodSelector = (query) => {
    if (query.periodicity === 'yearly') {
        return yearlyPandL(query)
    } else if (query.periodicity === 'monthly') {
        return monthlyPandL(query)
    } else if (query.periodicity === 'weekly') {
        return weeklyPandL(query)
    }
}

const yearlyPandL = (query) => {
    return [{
        '$match': {
            '_investor': new ObjectID(query.account),
            'date': {
                '$gte': new Date(query.startDate),
                '$lte': new Date(query.endDate)
            }
        }
    }, {
        '$group': {
            '_id': {
                'concept': '$concept',
                'year': {
                    '$year': '$date'
                }
            },
            'debit': {
                '$sum': '$debit'
            },
            'credit': {
                '$sum': '$credit'
            }
        }
    }, {
        '$project': {
            '_id': 0,
            'concept': '$_id.concept',
            'year': '$_id.year',
            'debit': 1,
            'credit': 1
        }
    }, {
        '$group': {
            '_id': {
                'year': '$year'
            },
            'accounts': {
                '$push': {
                    'concept': '$$ROOT.concept',
                    'balance': {
                        '$subtract': [
                            '$$ROOT.debit', '$$ROOT.credit'
                        ]
                    }
                }
            }
        }
    }, {
        '$project': {
            '_id': 0,
            'year': '$_id.year',
            'accounts': 1
        }
    }]
}

const monthlyPandL = (query) => {
    return [{
        '$match': {
            '_investor': new ObjectID(query.account),
            'date': {
                '$gte': new Date(query.startDate),
                '$lte': new Date(query.endDate)
            }
        }
    }, {
        '$group': {
            '_id': {
                'concept': '$concept',
                'month': {
                    '$month': '$date'
                },
                'year': {
                    '$year': '$date'
                }
            },
            'debit': {
                '$sum': '$debit'
            },
            'credit': {
                '$sum': '$credit'
            }
        }
    }, {
        '$project': {
            '_id': 0,
            'concept': '$_id.concept',
            'month': '$_id.month',
            'year': '$_id.year',
            'debit': 1,
            'credit': 1
        }
    }, {
        '$group': {
            '_id': {
                'year': '$year',
                'month': '$month'
            },
            'accounts': {
                '$push': {
                    'concept': '$$ROOT.concept',
                    'balance': {
                        '$subtract': [
                            '$$ROOT.debit', '$$ROOT.credit'
                        ]
                    }
                }
            }
        }
    }, {
        '$project': {
            '_id': 0,
            'year': '$_id.year',
            'month': '$_id.month',
            'accounts': 1
        }
    }]
}

const weeklyPandL = (query) => {
    return [{
        '$match': {
            '_investor': new ObjectID(query.account),
            'date': {
                '$gte': new Date(query.startDate),
                '$lte': new Date(query.endDate)
            }
        }
    }, {
        '$group': {
            '_id': {
                'concept': '$concept',
                'week': {
                    '$week': '$date'
                },
                'month': {
                    '$month': '$date'
                },
                'year': {
                    '$year': '$date'
                }
            },
            'debit': {
                '$sum': '$debit'
            },
            'credit': {
                '$sum': '$credit'
            }
        }
    }, {
        '$project': {
            '_id': 0,
            'concept': '$_id.concept',
            'week': '$_id.week',
            'month': '$_id.month',
            'year': '$_id.year',
            'debit': 1,
            'credit': 1
        }
    }, {
        '$group': {
            '_id': {
                'year': '$year',
                'month': '$month',
                'week': '$week'
            },
            'accounts': {
                '$push': {
                    'concept': '$$ROOT.concept',
                    'balance': {
                        '$subtract': [
                            '$$ROOT.debit', '$$ROOT.credit'
                        ]
                    }
                }
            }
        }
    }, {
        '$project': {
            '_id': 0,
            'year': '$_id.year',
            'month': '$_id.month',
            'week': '$_id.week',
            'accounts': 1
        }
    }]
}

const periodicityQuery = (query) => {
    var periodicity = {
        grouping: {},
        project: {},
        grouping2: {},
        project2: {}
    }

    if (query.periodicity == 'monthly') {
        periodicity.grouping['concept'] = '$concept'
        periodicity.grouping['month'] = {
            '$month': '$date'
        }
        periodicity.grouping['year'] = {
            '$year': '$date'
        }
    } else if (query.periodicity == 'yearly') {
        periodicity.grouping['concept'] = '$concept'
        periodicity.grouping['year'] = {
            '$year': '$date'
        }
    } else if (query.periodicity == 'weekly') {
        periodicity.grouping['concept'] = '$concept'
        periodicity.grouping['week'] = {
            '$week': '$date'
        }
        periodicity.grouping['month'] = {
            '$month': '$date'
        }
        periodicity.grouping['year'] = {
            '$year': '$date'
        }
    }

    if (query.periodicity == 'monthly') {
        periodicity.grouping2['month'] = {
            '$month': '$date'
        }
        periodicity.grouping2['year'] = {
            '$year': '$date'
        }
    } else if (query.periodicity == 'yearly') {
        periodicity.grouping2['year'] = {
            '$year': '$date'
        }
    } else if (query.periodicity == 'weekly') {
        periodicity.grouping2['week'] = {
            '$week': '$date'
        }
        periodicity.grouping2['month'] = {
            '$month': '$date'
        }
        periodicity.grouping2['year'] = {
            '$year': '$date'
        }
    }

    if (query.periodicity == 'monthly') {
        periodicity.project['_id'] = 0
        periodicity.project['concept'] = '$_id.concept'
        periodicity.project['month'] = '$_id.month'
        periodicity.project['year'] = '$_id.year'
        periodicity.project['debit'] = 1
        periodicity.project['credit'] = 1
    } else if (query.periodicity == 'yearly') {
        periodicity.project['_id'] = 0
        periodicity.project['concept'] = '$_id.concept'
        periodicity.project['year'] = '$_id.year'
        periodicity.project['debit'] = 1
        periodicity.project['credit'] = 1
    } else if (query.periodicity == 'weekly') {
        periodicity.project['_id'] = 0
        periodicity.project['concept'] = '$_id.concept'
        periodicity.project['week'] = '$_id.week'
        periodicity.project['month'] = '$_id.month'
        periodicity.project['year'] = '$_id.year'
        periodicity.project['debit'] = 1
        periodicity.project['credit'] = 1
    }

    if (query.periodicity == 'monthly') {
        periodicity.project2['_id'] = 0;
        periodicity.project2['month'] = '$_id.month';
        periodicity.project2['year'] = '$_id.year';
        periodicity.project2['accounts'] = 1;
    } else if (query.periodicity == 'yearly') {
        periodicity.project2['_id'] = 0
        periodicity.project2['year'] = '$_id.year'
        periodicity.project2['accounts'] = 1
    } else if (query.periodicity == 'weekly') {
        periodicity.project2['_id'] = 0
        periodicity.project2['week'] = '$_id.week'
        periodicity.project2['month'] = '$_id.month'
        periodicity.project2['year'] = '$_id.year'
        periodicity.project2['accounts'] = 1
    }
    return periodicity
}