"use strict"

const binary = require('binary')
const struct = require("bufferpack")
const pack = require("zeronet-protocol/lib/proto/pack")
const debug = require("debug")
const log = debug("zeronet:protocol")

let buff = JSON.parse('[{"type":"Buffer","data":[83,239,191,189,239,191,189,239,191,189,81,60]},{"type":"Buffer","data":[82,119,239,191,189,36,81,60]},{"type":"Buffer","data":[90,239,191,189,239,191,189,239,191,189,81,60]},{"type":"Buffer","data":[239,191,189,92,98,108,239,191,189,92,117,48,48,49,99,92,117,48,48,48,98]},{"type":"Buffer","data":[76,92,110,239,191,189,92,117,48,48,48,50,81,60]},{"type":"Buffer","data":[95,85,46,74,81,60]},{"type":"Buffer","data":[51,92,117,48,48,48,102,51,127,81,60]},{"type":"Buffer","data":[83,239,191,189,239,191,189,239,191,189,81,60]},{"type":"Buffer","data":[82,119,239,191,189,36,81,60]},{"type":"Buffer","data":[90,239,191,189,239,191,189,239,191,189,81,60]},{"type":"Buffer","data":[239,191,189,92,98,108,239,191,189,92,117,48,48,49,99,92,117,48,48,48,98]},{"type":"Buffer","data":[76,92,110,239,191,189,92,117,48,48,48,50,81,60]},{"type":"Buffer","data":[111,239,191,189,92,117,48,48,48,51,239,191,189,81,60]},{"type":"Buffer","data":[82,119,239,191,189,36,81,60]},{"type":"Buffer","data":[83,84,239,191,189,92,117,48,48,48,53,81,60]},{"type":"Buffer","data":[239,191,189,239,191,189,50,101,239,191,189,60]},{"type":"Buffer","data":[115,239,191,189,239,191,189,239,191,189,81,60]},{"type":"Buffer","data":[239,191,189,239,191,189,50,101,239,191,189,60]},{"type":"Buffer","data":[239,191,189,239,191,189,50,101,239,191,189,60]},{"type":"Buffer","data":[66,112,239,191,189,106,81,60]},{"type":"Buffer","data":[92,117,48,48,48,53,101,103,239,191,189,81,60]},{"type":"Buffer","data":[104,196,191,239,191,189,81,60]},{"type":"Buffer","data":[95,85,46,74,81,60]},{"type":"Buffer","data":[51,92,117,48,48,48,102,51,127,81,60]},{"type":"Buffer","data":[239,191,189,239,191,189,239,191,189,52,81,60]},{"type":"Buffer","data":[104,196,191,239,191,189,81,60]},{"type":"Buffer","data":[103,92,117,48,48,49,100,69,239,191,189,81,60]}]')

// let data = buff.map(d => new Buffer(d.data))
// console.log("data",data)
// console.log("packed",data.map(d => d.toString()).map(pack.v4.pack))
// console.log("unpacked",data.map(d => d.toString()).map(pack.v4.unpack))

// hack
let arrBuff = ""
let buffStr = new Buffer.from(JSON.stringify(buff)).toString().split('"type":"Buffer","data":').join().replace('[{', '').replace('}]', '')
let buffArr = buffStr.split('},{')

for (var i = 0, len = buffArr.length; i < len; i++) {
  arrBuff = buffArr[i].replace('[', '').replace(']', '').replace(',', '').toString()
  log("buffer: " + arrBuff)
  arrBuff = arrBuff.split(',')
  var vars = binary.parse(arrBuff)
    .word32bu('peer.addr') // 32bit unsigned bigendian
    .word16bu('peer.port') // 16bit unsigned bigendian
    .vars
  log("address: " + inet_ntoa(vars.peer.addr) + ":" + vars.peer.port)
}

// ip4 example: 192.168.2.1
function inet_aton(ip) {
  var a = ip.split('.') // split into octets
  var buffer = new ArrayBuffer(4)
  var dv = new DataView(buffer)
  for (var i = 0; i < 4; i++) {
    dv.setUint8(i, a[i])
  }
  return (dv.getUint32(0))
}

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


module.exports = function Defaults(protocol, zeronet) {
  protocol.handle("getFile", {
    site: "string",
    inner_path: "string",
    location: "number"
  }, {
    body: Buffer.isBuffer,
    location: "number",
    size: "number"
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("ping", {}, {
    body: b => b == "pong"
  }, (data, cb) => {
    cb(null, {
      body: "pong"
    })
  })

  protocol.handle("pex", {
    site: "string",
    peers: Array.isArray,
    peers_onion: () => true,
    //peers_onion: Array.isArray,
    need: "number"
  }, {
    peers: Array.isArray
  }, (data, cb) => {
    if (data.peers) console.log("Got peers", data.peers.map(pack.v4.unpack))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: parse peers
    //TODO: parse onion peers
  })

  protocol.handle("update", {
    site: "string",
    inner_path: "string",
    body: "string"
  }, {
    ok: "string"
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("listModified", {
    site: "string",
    since: "number"
  }, {
    modified_files: "object"
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("getHashfield", {
    site: "string"
  }, {
    hashfiled_raw: "object"
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("setHashfield", {
    site: "string",
    hasfield_raw: "object"
  }, {
    ok: "object"
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("findHashIds", {
    site: "string",
    hash_ids: Array.isArray //with numbers
  }, {
    peers: "object",
    peers_onion: "object"
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })
}
