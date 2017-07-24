"use strict"

const assert = require("assert")

module.exports = function PeersPacker() {
  const self = this
  const struct = require("bufferpack")
  const inet = require("inet")

  self.v4 = {
    pack: (ip, port) => inet.aton(ip) + struct.pack("H", port),
    unpack: pack => {
      //assert(pack.length == 6, "Invalid ipv4 length")
      return inet.ntoa(pack.split("").slice(0, 4)) + ":" + struct.unpack("H", pack, 4)
    }
  }

  /*
  # ip, port to packed 6byte format
  def packAddress(ip, port):
      return socket.inet_aton(ip) + struct.pack("H", port)

  # From 6byte format to ip, port
  def unpackAddress(packed):
      assert len(packed) == 6, "Invalid length ip4 packed address: %s" % len(packed)
      return socket.inet_ntoa(packed[0:4]), struct.unpack_from("H", packed, 4)[0]
  */

}
