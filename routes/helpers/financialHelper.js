let accounts = {
    "PERU": ['RBPERU'],
    "USA": ['GFUS', 'GCUS'],
    "DOMINICAN_REPUBLIC": ['GCDR']
}

const getCountryAccounts = (country) => {

    if (country === "GLOBAL") {
        return [].concat(...Object.values(accounts))
    } else {
        return accounts[country]
    }
}

const getCountry = (country) => {
    if (country === "GLOBAL") {
        return [
            'PERU', 'VENEZUELA', 'DOMINICAN_REPUBLIC'
        ]
    } else {
        return [country]
    }
}

module.exports = {
    getCountryAccounts,
    getCountry
}