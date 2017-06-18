"use strict"

const protocol = require(__dirname + "/../protocol")
const connection = require(__dirname + "/../connection")

function Client(options) { //zeronet client
  //can be created either via options.target
  //or stream from server can be passed in

  const self = this

  function end() {

  }

  const stream = options.stream ? options.stream : connection.create(options.target, err => {
    if (!err) return
    end()
    self.emit("error", err)
  })

  const p = new protocol(stream)

  this.getFile = p.getFile

}

module.exports = Client

require("util").inherits(Client, require("events").EventEmitter)
