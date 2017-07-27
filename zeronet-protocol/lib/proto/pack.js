"use strict"

const binary = require("binary")
const inet = require("zeronet-common/lib/network/inet")

/*
# ip, port to packed 6byte format
def packAddress(ip, port):
    return socket.inet_aton(ip) + struct.pack("H", port)

# From 6byte format to ip, port
def unpackAddress(packed):
    assert len(packed) == 6, "Invalid length ip4 packed address: %s" % len(packed)
    return socket.inet_ntoa(packed[0:4]), struct.unpack_from("H", packed, 4)[0]
*/

module.exports = function PeersPacker() {
  const self = this
  console.warn("new Pack() is deperacted. Please use Pack directly instead")
  self.v4 = module.exports.v4
}

module.exports.v4 = {
  //pack: (ip, port) => inet_aton(ip) + struct.pack("H", port),
  unpack: pack => {
    let i = binary.parse(new Buffer(pack)).word32bu("peer.addr").word16bu("peer.port").vars
    return inet.ntoa(i.peer.addr) + ":" + i.peer.port
  }
}
