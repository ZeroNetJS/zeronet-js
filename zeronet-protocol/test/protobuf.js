"use strict"

const assert = require("assert")

const Protocol = require("zeronet-protocol")

let msg

describe("protocol-buffers", () => {
  it("should parse sample 1 correct", () => {
    msg = new Protocol.PeerMSG({
      protobuf: {
        "1": [
          "string",
          "name"
        ]
      },
      strict: {
        "name": "string"
      }
    })
    assert.equal(msg.proto.def, "message PeerCmd {string name = 1 ;}", "protoparse output not matching")
  })
})
