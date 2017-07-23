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

  self.rules = rules

  self.verifySelf = cb => {

  }

  self.verifyFile = (path, hash, size) => {

  }

  self.createRuleBook = path => {

  }
}
