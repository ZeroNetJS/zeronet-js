"use strict"

const verify = require(__dirname + "/../verify")

module.exports = function Nonces() {
  let nonces = {}

  const keep = 10 * 1000 //keep every nonce 10secs

  function addNonce(path) {
    clean()
    const n = verify.genNonce()
    nonces[n] = {
      path,
      time: new Date().getTime() + keep
    }
    return n
  }

  function clean() {
    const now = new Date().getTime()
    Object.keys(nonces).map(non => {
      if (nonces[non].time < now) delete nonces[non]
    })
  }

  function validate(nonce, path) {
    clean()
    if (!nonces[nonce]) return false
    return nonces[nonce].path == path
  }

  function redemNonce(nonce, path) {
    const v = validate(nonce, path)
    if (v) delete nonces[nonce]
    return v
  }

  this.add = addNonce
  this.valid = validate
  this.redem = redemNonce
}
