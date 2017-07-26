"use strict"

const binary = require("binary")

// ip4 example: 192.168.2.1
/*function inet_aton(ip) {
  // split into octets
  var a = ip.split('.')
  var buffer = new ArrayBuffer(4)
  var dv = new DataView(buffer)
  for (var i = 0; i < 4; i++) {
    dv.setUint8(i, a[i])
  }
  return (dv.getUint32(0))
}*/

// num example: 3232236033
function inet_ntoa(num) {
  var nbuffer = new ArrayBuffer(4)
  var ndv = new DataView(nbuffer)
  ndv.setUint32(0, num)

  var a = []
  for (var i = 0; i < 4; i++) {
    a[i] = ndv.getUint8(i)
  }
  return a.join('.')
}

// const struct = require("bufferpack")
// const inet = require("inet")

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
    return inet_ntoa(i.peer.addr) + ":" + i.peer.port
  }
}
