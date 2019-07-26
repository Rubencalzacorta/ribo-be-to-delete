let accounts = {
    "PERU": ['REMPERU', 'PLPERU'],
    "USA": ['GFUS', 'GCUS'],
    "DOMINICAN_REPUBLIC": ['GCDR']
}

const getCountryAccounts = (country) => {

    if (country === "WORLD") {
        return [].concat(...Object.values(accounts))
    } else {
        return accounts[country]
    }
}

module.exports = {
    getCountryAccounts,
}