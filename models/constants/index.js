module.exports.collateralTypes = [
    'automobile',
    'motorcycle',
    'receivables',
    'investments',
    'machinaryAndEquipment',
    'valuablesAndColletibles',
    'electronicItems',
    'employmentBenefits'
]
module.exports.currentStatus = [
    'depositedIntoBranch',
    'collateralWithBorrower',
    'returnedToBorrower',
    'reposessionInitiated',
    'repossed',
    'underAuction',
    'sold',
    'transferedOwnership',
    'lost',
    'stolen',
    'insuranceClaim'
]

module.exports.locations = ['PERU', 'VENEZUELA', 'DOMINICAN_REPUBLIC', 'GLOBAL', 'USA']

module.exports.countries = ['PERU', 'VENEZUELA', 'DOMINICAN_REPUBLIC']

module.exports.useOfFunds = [
    'vehicle',
    'motorcycle',
    'personal',
    'payroll',
    'workingCapital',
    'capitalGoods',
    'refinancing',
    'debtConsolidation',
    'factoring',
    'vehicleWithInsurance',
    'motorcycleWithInsurance',
    'personalWithInsurance',
    'capitalGoodsWithInsurance',
    'creditLine'
]

module.exports.methods = [
    "CHECK",
    "DEPOSIT",
    "TRANSFER",
    "CARD",
    "ZELLE",
    "YAPE"
]

module.exports.txConcepts = {
    'DEPOSIT': 'DEBIT',
    'DIVESTMENT': 'DEBIT',
    'INVESTMENT': 'CREDIT',
    'WITHDRAWAL': 'CREDIT',
    'INTERNAL_TRANSFER_RECIPIENT': 'DEBIT',
    'INTERNAL_TRANSFER_SENDER': 'CREDIT',
    'INTERNATIONAL_TRANSFER_RECIPIENT': 'DEBIT',
    'INTERNATIONAL_TRANSFER_SENDER': 'CREDIT',
    'DIVIDENDS': 'CREDIT',
    'DIVIDEND_INCOME': 'DEBIT',
    'INTEREST': 'DEBIT',
    'INTEREST_COST': 'CREDIT',
    'CAPITAL': 'DEBIT',
    'FEE': 'CREDIT',
    'COST': 'CREDIT',
    'UNCLASSIFIED_COST': 'CREDIT',
    'COMMISSION_INCOME': 'DEBIT',
    'COMMISSION_COST': 'CREDIT',
    'MANAGEMENT_FEE_INCOME': 'DEBIT',
    'MANAGEMENT_FEE_COST': 'CREDIT',
    'MANAGEMENT_INTEREST_INCOME': 'DEBIT',
    'MANAGEMENT_INTEREST_COST': 'CREDIT',
    'INSURANCE_COST': 'CREDIT',
    'INSURANCE_PREMIUM': 'DEBIT',
    'BANKING_FEE': 'CREDIT',
    'BANKING_TRANSFER_FEE': 'CREDIT',
    'INCOME_ORIGINATION_FEE': 'DEBIT',
    'COST_ORIGINATION_LEGAL': 'CREDIT',
    'COST_ORIGINATION_TRANSPORT': 'CREDIT',
    'COST_ORIGINATION_EXPENSES': 'CREDIT',
    'COST_ORIGINATION_SENTINEL': 'CREDIT',
    'COST_SERVICING_LEGAL': 'CREDIT',
    'COST_SERVICING_TRANSPORT': 'CREDIT',
    'COST_SERVICING_EXPENSES': 'CREDIT',
    'SALARY': 'CREDIT',
    'SG&A_MARKETING': 'CREDIT',
    'SG&A_ACCOUNTING': 'CREDIT',
    'SG&A_TECH_SERVICES': 'CREDIT',
    'SG&A_LEGAL': 'CREDIT',
    'SG&A_MAILING': 'CREDIT',
    'SG&A_MISCELLANEOUS': 'CREDIT',
    'SG&A_OFFICE_RENT': 'CREDIT',
    'SG&A_OFFICE_PRINT': 'CREDIT',
    'SG&A_OFFICE_STORAGE': 'CREDIT',
    'TRAVEL_EXPENSES': 'CREDIT',
    'TRANSPORT': 'CREDIT',
}

module.exports.condition = [
    'new',
    'excellent',
    'good',
    'fair',
    'demaged'
]
module.exports.loanControlStatus = [
    "inReview",
    "approved",
    "denied",
    "open",
    "terminated",
    "paid",
    "canceled",
]
module.exports.loanPaymentStatus = [
    "late",
    "late30",
    "late60",
    "late90",
    "current",
    "defaulted",
    "chargedOff",
]
// credit = (concepts) => [{
//     'commission': {
//         '$sum': {
//             '$cond': [{
//                 '$eq': [
//                     '$concept', concept
//                 ]
//             }, '$credit', 0]
//         }
//     }
// }]