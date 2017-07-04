"use strict"

const btcMessage = require("bitcoinjs-message")

function VerifySig(address, data, sig) {
  return btcMessage.verify(data, "\x18Bitcoin Signed Message:\n", address, sig)
}

function OrderObject(unordered) {
  const ordered = {}
  Object.keys(unordered).sort().forEach(function (key) {
    ordered[key] = typeof unordered[key] == "object" ? OrderObject(unordered[key]) : unordered[key]
  })
  return ordered
}

function JSONBlock(data) { //zeronet sign's json in this format
  return JSON.stringify(OrderObject(data))
}

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
  delete data.signs_required
  delete data.signers_sign

  const real = JSONBlock(data) //the data that was actually signed
  const sigsig = signers_sign //signers_sign
  const vs = GetValidSigners(address, inner_path, data) //valid signers
  const sigsigdata = GetSigners(vs, signs_required) //signers_sign data

  if (!VerifySig(address, sigsigdata, sigsig)) throw new Error("Invalid signers_sign or signers")

  let vss = 0 //valid signs found

  vs.forEach(addr => {
    if (vss < signs_required) {
      //console.log(addr, real, signs[addr], VerifySig(addr, real, signs[addr]))
      if (VerifySig(addr, real, signs[addr])) vss++
    }
  })

  if (vss < signs_required) throw new Error("Found " + vss + " vaild sign(s) but " + signs_required + " is/are needed")

  return true

}

module.exports = {
  OrderObject,
  VerifyContentJSON,
  VerifySig,
  JSONBlock,
  GetValidSigners,
  GetSigners
}
