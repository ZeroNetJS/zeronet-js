"use strict"

const crypto = require("zeronet-crypto")

/**
 * Zite content.json
 * @param {Zite} zite
 * @param {string} inner_path - Path of the content.json
 * @param {object} data - JSON parsed data of the content.json
 * @param {RuleBook} rules - RuleBook containing the rules for the zite
 * @namespace ContentJSON
 * @constructor
 */
module.exports = function ContentJSON(zite, inner_path, data, rules) {
  const self = this
  const address = zite.address

  self.rules = rules

  self.verifySelf = cb => {
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

    const real = crypto.PythonJSONDump(data) //the data that was actually signed
    const sigsig = signers_sign //signers_sign
    const vs = rules.signs.getValidKeys() //GetValidSigners(address, inner_path, data) //valid signers
    const sigsigdata = self.GetSigners(vs, signs_required) //signers_sign data

    if (!crypto.VerifySig(address, sigsigdata, sigsig)) throw new Error("Invalid signers_sign or signers")

    let vss = 0 //valid signs found

    vs.forEach(addr => {
      if (vss < signs_required)
        if (crypto.VerifySig(addr, real, signs[addr])) vss++
    })

    if (vss < signs_required) throw new Error("Found " + vss + " vaild sign(s) but " + signs_required + " is/are needed")

    return true
  }

  self.verifyFile = (path, hash, size) => {

  }

  self.getValidSigners = () => {
    let valid_signers = []
    if (inner_path == "content.json") {
      if (data.signers) valid_signers = Object.keys(data.signers)
    } else {
      //TODO: multi-user
    }
    if (valid_signers.indexOf(address) == -1) valid_signers.push(address) //Address is always a valid signer
    return valid_signers
  }

  self.createRuleBook = path => {

  }
}
