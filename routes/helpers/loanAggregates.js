const loansTotalRemaining = (status) => {
    return [{
    '$match': {
        'status': `${status}`
      }
    }, {
      '$group': {
        '_id': 'totals', 
        'totalRemaining': {
          '$sum': '$capitalRemaining'
        }
      }
    }
  ]
}
const loansTotalPaid = (status) => {
    return [{
    '$match': {
        'status': `${status}`
      }
    }, {
      '$group': {
        '_id': 'totals', 
        'totalPaid': {
            '$sum': '$totalPaid'
          }, 
      }
    }
  ]
}

const loansTotalNominal = (status) => {
    return [{
    '$match': {
        'status': `${status}`
      }
    }, {
      '$group': {
        '_id': 'totals', 
        'totalNominal': {
            '$sum': '$capital'
          }
      }
    }
  ]
}

const loansTotalCollateral = (status) => {
    return [{
    '$match': {
        'status': `${status}`
      }
    }, {
      '$group': {
        '_id': 'totals', 
        'totalCollateral': {
            '$sum': '$collateralValue'
          }
      }
    }
  ]
}

