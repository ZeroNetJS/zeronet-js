"use strict"

const assert = require("assert")

module.exports = function PeersPacker() {
  const self = this
  const struct = require("bufferpack")

  // const inet = require("inet")

  self.v4 = {
    pack: (ip, port) => inet_aton(ip) + struct.pack("H", port),
    unpack: pack => {
      //assert(pack.length == 6, "Invalid ipv4 length")
      return inet_ntoa(pack.split("").slice(0, 4)) + ":" + struct.unpack("H", pack, 4)
    }
  }
  
  // ip4 example: 192.168.2.1
  function inet_aton(ip){
    // split into octets
    var a = ip.split('.');
    var buffer = new ArrayBuffer(4);
    var dv = new DataView(buffer);
    for(var i = 0; i < 4; i++){
        dv.setUint8(i, a[i]);
    }
    return(dv.getUint32(0));
  }

  // num example: 3232236033
  function inet_ntoa(num){
    var nbuffer = new ArrayBuffer(4);
    var ndv = new DataView(nbuffer);
    ndv.setUint32(0, num);

    var a = new Array();
    for(var i = 0; i < 4; i++){
        a[i] = ndv.getUint8(i);
    }
    return a.join('.');
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
