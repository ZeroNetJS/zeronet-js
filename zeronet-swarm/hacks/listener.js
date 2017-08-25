'use strict'

const pull = require('pull-stream')
const isFunction = require('lodash.isfunction')
const assert = require('assert')
const select = require('multistream-select/src/select')
const selectHandler = require('./select-handler')
const lsHandler = require('multistream-select/src/listener/ls-handler')
const matchExact = require('multistream-select/src/listener/match-exact')

const util = require('multistream-select/src/util')
const Connection = require('interface-connection').Connection

const PROTOCOL_ID = require('multistream-select/src/constants').PROTOCOL_ID

const upgradeConn = require("./upgradeConn")

/**
 * Listener
 */
class Listener {
  /**
   * Create a new Listener.
   */
  constructor () {
    this.handlers = {
      ls: {
        handlerFunc: (protocol, conn) => lsHandler(this, conn),
        matchFunc: matchExact

      }
    }
    this.log = util.log.listener()
  }

  /**
   * Perform the multistream handshake.
   *
   * @param {Connection} rawConn - The connection on which
   * to perform the handshake.
   * @param {function(Error)} callback - Called when the handshake completed.
   * @returns {undefined}
   */
  handle (rawConn, callback) {
    this.log('listener handle conn')

    const selectStream = select(PROTOCOL_ID, (err, conn) => {
      if (err) {
        return callback(err)
      }

      const shConn = new Connection(conn, rawConn)

      upgradeConn(rawConn, shConn)

      const sh = selectHandler(shConn, this.handlers, this.log)

      pull(
        shConn,
        sh,
        shConn
      )

      callback()
    }, this.log)

    pull(
      rawConn,
      selectStream,
      rawConn
    )
  }

  /**
   * Handle a given `protocol`.
   *
   * @param {string} protocol - A string identifying the protocol.
   * @param {function(string, Connection)} handlerFunc - Will be called if there is a handshake performed on `protocol`.
   * @param {matchHandler} [matchFunc=matchExact]
   * @returns {undefined}
   */
  addHandler (protocol, handlerFunc, matchFunc) {
    this.log('adding handler: ' + protocol)
    assert(isFunction(handlerFunc), 'handler must be a function')

    if (this.handlers[protocol]) {
      this.log('overwriting handler for ' + protocol)
    }

    if (!matchFunc) {
      matchFunc = matchExact
    }

    this.handlers[protocol] = {
      handlerFunc: handlerFunc,
      matchFunc: matchFunc
    }
  }

  /**
   * Receives a protocol and a callback and should
   * call `callback(err, result)` where `err` is if
   * there was a error on the matching function, and
   * `result` is a boolean that represents if a
   * match happened.
   *
   * @callback matchHandler
   * @param {string} myProtocol
   * @param {string} senderProtocol
   * @param {function(Error, boolean)} callback
   * @returns {undefined}
   */
}

module.exports = Listener
