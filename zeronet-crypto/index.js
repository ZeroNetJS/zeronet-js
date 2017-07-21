"use strict"

const btcMessage = require("bitcoinjs-message")

/**
  Verifies a bitcoin signature
  * @param {string} address - Bitcoin address of the signer
  * @param {string} data - Data that was signed
  * @param {string} signature - Signature of the data
  * @return {boolean} - Returns wether the signature was valid and signed with the key
  */
function VerifySig(address, data, sig) {
  return btcMessage.verify(data, "\x18Bitcoin Signed Message:\n", address, sig)
}

/**
  Orders an object
  Example: {z: true, a: 1, q: {1: true, 0: -1}} => {a: 1, q: {0: -1, 1: true}, z: true}
  * @param {object} unordered - Object with unordered keys
  * @return {object} - Object with ordered keys
  */
function OrderObject(unordered) {
  const ordered = {}
  Object.keys(unordered).sort().forEach(function (key) {
    ordered[key] = ((typeof unordered[key] == "object") && !Array.isArray(unordered[key])) ? OrderObject(unordered[key]) : unordered[key]
  })
  return ordered
}

/**
  Python style json dump with 1 space
  Fixed as only this way the data is equal on all devices
  (The historic reason why python style is used is simply that the first zeronet version was written in python)
  * @param {object} data - Arbitrary object
  * @return {string} - Stringified JSON
  */
function PythonJSONDump(data) {
  return JSON.stringify(OrderObject(data), null, 1).replace(/\n/g, "").replace(/  +/g, " ").replace(/([\{\[]) /g, "$1").replace(/ ([\}\]])/g, "$1")
}

/**
  Gets the valid signers for a file based on it's path and address
  To be deperacted
  * @param {string} address - The address of the zie
  * @param {string} inner_path - The path of the content.json file
  * @param {object} data - The content.json contents as object
  * @return {array} - Array of valid signers
  */
function GetValidSigners(address, inner_path, data) {
  let valid_signers = []
  if (inner_path == "content.json") {
    if (data.signers) valid_signers = Object.keys(data.signers)
  } else {
    //TODO: multi-user
  }
  if (valid_signers.indexOf(address) == -1) valid_signers.push(address) //Address is always a valid signer
  return valid_signers
}

/**
  Returns the signers_sign based on the array of valid signers and singers_required
  * @param {array} valid_signers - Valid signers array
  * @param {number} signers_required - The signers required
  * @return {string} - signers_sign data field
  */
function GetSigners(vs, sr) {
  return sr + ":" + vs.join(",")
}

function VerifyContentJSON(address, inner_path, data) {
  /*
  data is an object.
  we need to get the signing data from the object and remove the signs
  it's keys need to be sorted alphapetically and then stringified without withespace
  */
  const {
    signs,
    signs_required,
    signers_sign
  } = data

  delete data.sign
  delete data.signs

  const real = PythonJSONDump(data) //the data that was actually signed
  const sigsig = signers_sign //signers_sign
  const vs = GetValidSigners(address, inner_path, data) //valid signers
  const sigsigdata = GetSigners(vs, signs_required) //signers_sign data

  if (!VerifySig(address, sigsigdata, sigsig)) throw new Error("Invalid signers_sign or signers")

  let vss = 0 //valid signs found

  vs.forEach(addr => {
    if (vss < signs_required)
      if (VerifySig(addr, real, signs[addr])) vss++
  })

  if (vss < signs_required) throw new Error("Found " + vss + " vaild sign(s) but " + signs_required + " is/are needed")

  return true

}

module.exports = {
  OrderObject,
  VerifyContentJSON,
  VerifySig,
  PythonJSONDump,
  GetValidSigners,
  GetSigners
}
