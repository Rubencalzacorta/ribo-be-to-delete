const countryPaidQuery = (country, fromDate, toDate) => {
    return [{
      '$lookup': {
        'from': 'loans', 
        'localField': '_loan', 
        'foreignField': '_id', 
        'as': 'details'
      }
    }, {
      '$lookup': {
        'from': 'users', 
        'localField': 'details._borrower', 
        'foreignField': '_id', 
        'as': 'borrower'
      }
    }, {
      '$match': {
        'details.status': {'$ne': 'CLOSED'}, 
        'date': {
          '$gte': new Date(fromDate), 
          '$lte': new Date(toDate)
        }, 
        'borrower.country': country,
        'status': 'PAID',
      }
    },{
      '$project': {
        '_id': 1, 
        '_loan': 1, 
        'date': 1, 
        'date_pmt': 1, 
        'payment': 1, 
        'principal': 1, 
        'balance': 1, 
        'interest': 1,
        'interest_pmt': 1, 
        'principal_pmt': 1, 
        'status': 1, 
        'loanStatus': {
          '$arrayElemAt': [
            '$details.status', 0
          ]
        }, 
        'loanCapital': {
          '$arrayElemAt': [
            '$details.capital', 0
          ]
        }, 
        'loanPaidCapital': {
          '$arrayElemAt': [
            '$details.totalPaid', 0
          ]
        }, 
        'firstName': {
          '$arrayElemAt': [
            '$borrower.firstName', 0
          ]
        }, 
        'lastName': {
          '$arrayElemAt': [
            '$borrower.lastName', 0
          ]
        }
      }
    }, {
      '$sort': {
        'date': 1
      }
    }]
}

const countryAllLoansQuery = (country, fromDate, toDate) => {
    return [{
      '$lookup': {
        'from': 'loans', 
        'localField': '_loan', 
        'foreignField': '_id', 
        'as': 'details'
      }
    }, {
      '$lookup': {
        'from': 'users', 
        'localField': 'details._borrower', 
        'foreignField': '_id', 
        'as': 'borrower'
      }
    }, {
      '$match': {
        'details.status': {'$ne': 'CLOSED'}, 
        'date': {
          '$gte': new Date(fromDate), 
          '$lte': new Date(toDate)
        }, 
        'borrower.country': country,
        'status': {'$ne': 'DISBURSTMENT'},
      }
    },{
      '$project': {
        '_id': 1, 
        '_loan': 1, 
        'date': 1, 
        'date_pmt': 1, 
        'payment': 1, 
        'principal': 1, 
        'balance': 1, 
        'interest': 1,
        'interest_pmt': 1, 
        'principal_pmt': 1, 
        'status': 1, 
        'loanStatus': {
          '$arrayElemAt': [
            '$details.status', 0
          ]
        }, 
        'loanCapital': {
          '$arrayElemAt': [
            '$details.capital', 0
          ]
        }, 
        'loanPaidCapital': {
          '$arrayElemAt': [
            '$details.totalPaid', 0
          ]
        }, 
        'firstName': {
          '$arrayElemAt': [
            '$borrower.firstName', 0
          ]
        }, 
        'lastName': {
          '$arrayElemAt': [
            '$borrower.lastName', 0
          ]
        }
      }
    }, {
      '$sort': {
        'date': 1
      }
    }]
}

const countryDueQuery = (country, fromDate, toDate) => {
    return [{
      '$lookup': {
        'from': 'loans', 
        'localField': '_loan', 
        'foreignField': '_id', 
        'as': 'details'
      }
    }, {
      '$lookup': {
        'from': 'users', 
        'localField': 'details._borrower', 
        'foreignField': '_id', 
        'as': 'borrower'
      }
    }, {
      '$match': {
        'details.status': {'$ne': 'CLOSED'}, 
        'date': {
          '$gte': new Date(fromDate), 
          '$lte': new Date(toDate)
        }, 
        'borrower.country': country,
        'status': 'DUE',
      }
    },{
      '$project': {
        '_id': 1, 
        '_loan': 1, 
        'date': 1, 
        'date_pmt': 1, 
        'payment': 1, 
        'principal': 1, 
        'balance': 1, 
        'interest': 1,
        'interest_pmt': 1, 
        'principal_pmt': 1, 
        'status': 1, 
        'loanStatus': {
          '$arrayElemAt': [
            '$details.status', 0
          ]
        }, 
        'loanCapital': {
          '$arrayElemAt': [
            '$details.capital', 0
          ]
        }, 
        'loanPaidCapital': {
          '$arrayElemAt': [
            '$details.totalPaid', 0
          ]
        }, 
        'firstName': {
          '$arrayElemAt': [
            '$borrower.firstName', 0
          ]
        }, 
        'lastName': {
          '$arrayElemAt': [
            '$borrower.lastName', 0
          ]
        }
      }
    }, {
      '$sort': {
        'date': 1
      }
    }
]}

const countryOverdueQuery = (country) => {
    return [{
      '$lookup': {
        'from': 'loans', 
        'localField': '_loan', 
        'foreignField': '_id', 
        'as': 'details'
      }
    }, {
      '$lookup': {
        'from': 'users', 
        'localField': 'details._borrower', 
        'foreignField': '_id', 
        'as': 'borrower'
      }
    }, {
      '$match': {
        'details.status': {'$ne': 'CLOSED'}, 
        'borrower.country': country,
        'status': 'OVERDUE',
      }
    },{
      '$project': {
        '_id': 1, 
        '_loan': 1, 
        'date': 1, 
        'date_pmt': 1, 
        'payment': 1, 
        'principal': 1, 
        'balance': 1, 
        'interest': 1,
        'interest_pmt': 1, 
        'principal_pmt': 1, 
        'status': 1, 
        'loanStatus': {
          '$arrayElemAt': [
            '$details.status', 0
          ]
        }, 
        'loanCapital': {
          '$arrayElemAt': [
            '$details.capital', 0
          ]
        }, 
        'loanPaidCapital': {
          '$arrayElemAt': [
            '$details.totalPaid', 0
          ]
        }, 
        'firstName': {
          '$arrayElemAt': [
            '$borrower.firstName', 0
          ]
        }, 
        'lastName': {
          '$arrayElemAt': [
            '$borrower.lastName', 0
          ]
        }
      }
    }, {
      '$sort': {
        'date': 1
      }
    }
]}

const allLoansQuery = (fromDate, toDate) => {
  return [{
    '$lookup': {
      'from': 'loans', 
      'localField': '_loan', 
      'foreignField': '_id', 
      'as': 'details'
    }
  }, {
    '$lookup': {
      'from': 'users', 
      'localField': 'details._borrower', 
      'foreignField': '_id', 
      'as': 'borrower'
    }
  }, {
    '$match': {
      'details.status': {'$ne': 'CLOSED'}, 
      'date': {
        '$gte': new Date(fromDate), 
        '$lte': new Date(toDate)
      }, 
      'status': {'$ne': 'DISBURSTMENT'},
    }
  },{
    '$project': {
      '_id': 1, 
      '_loan': 1, 
      'date': 1, 
      'date_pmt': 1, 
      'payment': 1, 
      'principal': 1, 
      'balance': 1, 
      'interest': 1,
      'interest_pmt': 1, 
      'principal_pmt': 1, 
      'status': 1, 
      'loanStatus': {
        '$arrayElemAt': [
          '$details.status', 0
        ]
      }, 
      'loanCapital': {
        '$arrayElemAt': [
          '$details.capital', 0
        ]
      }, 
      'loanPaidCapital': {
        '$arrayElemAt': [
          '$details.totalPaid', 0
        ]
      }, 
      'firstName': {
        '$arrayElemAt': [
          '$borrower.firstName', 0
        ]
      }, 
      'lastName': {
        '$arrayElemAt': [
          '$borrower.lastName', 0
        ]
      }
    }
  }, {
    '$sort': {
      'date': 1
    }
  }]
}
const paidQuery = (fromDate, toDate) => {
  return [{
    '$lookup': {
      'from': 'loans', 
      'localField': '_loan', 
      'foreignField': '_id', 
      'as': 'details'
    }
  }, {
    '$lookup': {
      'from': 'users', 
      'localField': 'details._borrower', 
      'foreignField': '_id', 
      'as': 'borrower'
    }
  }, {
    '$match': {
      'details.status': {'$ne': 'CLOSED'}, 
      'date': {
        '$gte': new Date(fromDate), 
        '$lte': new Date(toDate)
      }, 
      'status': 'PAID'
    }
  },{
    '$project': {
      '_id': 1, 
      '_loan': 1, 
      'date': 1, 
      'date_pmt': 1, 
      'payment': 1, 
      'principal': 1, 
      'balance': 1, 
      'interest': 1,
      'interest_pmt': 1, 
      'principal_pmt': 1, 
      'status': 1, 
      'loanStatus': {
        '$arrayElemAt': [
          '$details.status', 0
        ]
      }, 
      'loanCapital': {
        '$arrayElemAt': [
          '$details.capital', 0
        ]
      }, 
      'loanPaidCapital': {
        '$arrayElemAt': [
          '$details.totalPaid', 0
        ]
      }, 
      'firstName': {
        '$arrayElemAt': [
          '$borrower.firstName', 0
        ]
      }, 
      'lastName': {
        '$arrayElemAt': [
          '$borrower.lastName', 0
        ]
      }
    }
  }, {
    '$sort': {
      'date': 1
    }
  }]
}
const dueQuery = (fromDate, toDate) => {
  return [{
    '$lookup': {
      'from': 'loans', 
      'localField': '_loan', 
      'foreignField': '_id', 
      'as': 'details'
    }
  }, {
    '$lookup': {
      'from': 'users', 
      'localField': 'details._borrower', 
      'foreignField': '_id', 
      'as': 'borrower'
    }
  }, {
    '$match': {
      'details.status': {'$ne': 'CLOSED'}, 
      'date': {
        '$gte': new Date(fromDate), 
        '$lte': new Date(toDate)
      }, 
      'status': 'DUE',
    }
  },{
    '$project': {
      '_id': 1, 
      '_loan': 1, 
      'date': 1, 
      'date_pmt': 1, 
      'payment': 1, 
      'principal': 1, 
      'balance': 1, 
      'interest': 1,
      'interest_pmt': 1, 
      'principal_pmt': 1, 
      'status': 1, 
      'loanStatus': {
        '$arrayElemAt': [
          '$details.status', 0
        ]
      }, 
      'loanCapital': {
        '$arrayElemAt': [
          '$details.capital', 0
        ]
      }, 
      'loanPaidCapital': {
        '$arrayElemAt': [
          '$details.totalPaid', 0
        ]
      }, 
      'firstName': {
        '$arrayElemAt': [
          '$borrower.firstName', 0
        ]
      }, 
      'lastName': {
        '$arrayElemAt': [
          '$borrower.lastName', 0
        ]
      }
    }
  }, {
    '$sort': {
      'date': 1
    }
  }
]}
const overdueQuery = () => {
  return [{
    '$lookup': {
      'from': 'loans', 
      'localField': '_loan', 
      'foreignField': '_id', 
      'as': 'details'
    }
  }, {
    '$lookup': {
      'from': 'users', 
      'localField': 'details._borrower', 
      'foreignField': '_id', 
      'as': 'borrower'
    }
  }, {
    '$match': {
      'details.status': {'$ne': 'CLOSED'}, 
      'status': 'OVERDUE',
    }
  },{
    '$project': {
      '_id': 1, 
      '_loan': 1, 
      'date': 1, 
      'date_pmt': 1, 
      'payment': 1, 
      'principal': 1, 
      'balance': 1, 
      'interest': 1,
      'interest_pmt': 1, 
      'principal_pmt': 1, 
      'status': 1, 
      'loanStatus': {
        '$arrayElemAt': [
          '$details.status', 0
        ]
      }, 
      'loanCapital': {
        '$arrayElemAt': [
          '$details.capital', 0
        ]
      }, 
      'loanPaidCapital': {
        '$arrayElemAt': [
          '$details.totalPaid', 0
        ]
      }, 
      'firstName': {
        '$arrayElemAt': [
          '$borrower.firstName', 0
        ]
      }, 
      'lastName': {
        '$arrayElemAt': [
          '$borrower.lastName', 0
        ]
      }
    }
  }, {
    '$sort': {
      'date': 1
    }
  }]
}

module.exports = {
    countryPaidQuery,
    countryAllLoansQuery,
    countryDueQuery,
    countryOverdueQuery,
    allLoansQuery,
    paidQuery,
    dueQuery,
    overdueQuery
}