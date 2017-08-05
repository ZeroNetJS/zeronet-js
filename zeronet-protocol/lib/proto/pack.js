"use strict"

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
  pack: (conn) => {
    let ip = conn.split(':')[0]
    let port = conn.split(':')[1]
    ip = inet.pton(ip)
    port = inet.pton(inet.ntoa(port)).substr(2,2).split('')
    port = port[1] + port[0] // reverse order (little endian)
    return ip + port
  },
  unpack: pack => {
    let ip = pack.substr(0, 4)
    let port = pack.substr(4, 2)
    ip = inet.ntop(ip)
    port = inet.ntop(port+port).split(".")
    port = (parseInt(port[1]) * 256) + parseInt(port[0]) // reverse order (little endian)
	return ip + ":" + port
  }
}
