"use strict"

const crypto = require("zeronet-crypto")
const fallaby = require("zeronet-fallaby")

/**
 * Zite content.json
 * @param {Zite} zite
 * @param {string} inner_path - Path of the content.json
 * @param {object} data - JSON parsed data of the content.json
 * @param {RuleBook} rules - RuleBook containing the rules for the zite
 * @namespace ContentJSON
 * @constructor
 */
module.exports = function ContentJSON(zite, inner_path, data) {
  const self = this

  const rules = self.rules = zite.tree.getRuleBook(inner_path, data)
  const newfmt = fallaby.contentJson.process(data)
  self.files = newfmt.files

  self.verifySelf = () => {
    /*
    data is an object.
    we need to get the signing data from the object and remove the signs
    it's keys need to be sorted alphapetically and then stringified without withespace
    */
    const {
      signs,
      signers_sign
    } = data

    delete data.sign
    delete data.signs

    const real = crypto.PythonJSONDump(data) //the data that was actually signed

    const vs = rules.signs.getValidKeys() //GetValidSigners(address, inner_path, data) //valid signers
    const signs_required = rules.signs.getSignsRequired()
    const signers_sign_data = crypto.GetSigners(vs, signs_required) //construct signers_sign data from what we were given

    //these 2 functions throw on failure. no need for if checks
    rules.signers_sign.verifyManyToOne(signers_sign_data, signers_sign)
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
