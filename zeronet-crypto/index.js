module.exports = function ZeroNetCrypto() {
  function OrderObject(unordered) {
    const ordered = {}
    Object.keys(unordered).sort().forEach(function (key) {
      ordered[key] = typeof unordered[key] == "object" ? OrderObject(unordered[key]) : unordered[key]
    })
  }

  function VerifyContentJSON(address, data) {
    /*
    data is an object.
    we need to get the signing data from the object and remove the signs
    it's keys need to be sorted alphapetically and then stringified without withespace
    */
    const signs = data.signs
    delete data.signs

    const real = JSON.stringify(OrderObject(data))
  }
}
