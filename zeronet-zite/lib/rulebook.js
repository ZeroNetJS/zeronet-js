/**
 * A rule book defines which and how many keys can/have to sign
 * @namespace RuleBook
 * @constructor
 */
function RuleBook() {
  const self = this
  self.isKeyAllowed = key => {}
  self.getSignersRequired = () => {}
  self.getValidKeys = () => []
  self.createSubBook = path => {
    let book = new RuleBook()
  }
}

module.exports=RuleBook
