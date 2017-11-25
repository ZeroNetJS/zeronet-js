"use strict"

const pack = require("zeronet-protocol/lib/zero/pack")
const assert = require("assert")
const crypto = require("zeronet-crypto")

const map = {
  "\x01\x02\x03\x047\x00": "1.2.3.4:55",
  "\x7f\x00\x00\x01\xb0\x9d": "127.0.0.1:40368",
  "\x05\x01\xad\xf0\xd8\x0f": "5.1.173.240:4056"
}
describe("pack", () => {
  Object.keys(map).forEach(packed => {
    it("should unpack " + crypto.PythonJSONDump(packed) + " as " + map[packed], () => assert.equal(pack.v4.unpack(packed), map[packed]))
    it("should pack " + map[packed] + " as " + crypto.PythonJSONDump(packed), () => assert.equal(pack.v4.pack(map[packed]), packed))
  })
})
