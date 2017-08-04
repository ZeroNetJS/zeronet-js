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
  //const address = zite.address

  self.rules = rules

  self.verifySelf = () => {
    /*
    data is an object.
    we need to get the signing data from the object and remove the signs
    it's keys need to be sorted alphapetically and then stringified without withespace
    */
    const {
      signs,
      //signs_required,
      signers_sign
    } = data

    delete data.sign
    delete data.signs

    const real = crypto.PythonJSONDump(data) //the data that was actually signed
    const sigsig = signers_sign //signers_sign
    const vs = rules.signs.getValidKeys() //GetValidSigners(address, inner_path, data) //valid signers
    const signs_required = rules.signs.getSignsRequired()
    console.log("vs",vs)
    const sigsigdata = crypto.GetSigners(vs, signs_required) //construct signers_sign data from what we were given

    rules.signers_sign.verifyManyToOne(sigsigdata, sigsig)
    rules.signs.verifyManyToMany(real, signs)

    return true
  }

  /*self.verifyFile = (path, hash, size) => {

  }*/

  /*self.getValidSigners = () => {
    let valid_signers = []
    if (inner_path == "content.json") {
      if (data.signers) valid_signers = Object.keys(data.signers)
    } else {
      //TODO: multi-user
    }
    if (valid_signers.indexOf(address) == -1) valid_signers.push(address) //Address is always a valid signer
    return valid_signers
  }*/
}
