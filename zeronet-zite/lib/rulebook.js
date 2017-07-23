const crypto = require("zeronet-crypto")

/**
 * A rule book defines which and how many keys can/have to sign
 * @namespace RuleBook
 * @constructor
 */
function RuleBook(opt) {
  const self = this

  self.valid_keys = opt.valid_keys
  self.signers_required = opt.signers_required

  self.isKeyAllowed = key => self.validKeys.indexOf(key) != -1
  self.getSignersRequired = () => self.signers_required
  self.getValidKeys = () => self.validKeys
  self.verifySignature=(data,sig) => {

  }
  self.createSubBook = opt => {
    //let book = new RuleBook()
  }
}

module.exports = RuleBook
