"use strict"

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
    if (!zeronet.zites[data.zite]) return cb(new Error("Unknown site"))
    //TODO: finish
  })

  protocol.handle("ping", {}, {
    body: b => b == "pong"
  })

  protocol.handle("pex", {
    site: "string",
    peers: "string",
    need: "number"
  }, {
    peers: "string" //FIXME: wrong type
  })

  protocol.handle("update", {
    site: "string",
    inner_path: "string",
    body: "object"
  }, {
    ok: "string"
  })

  protocol.handle("listModified", {
    site: "string",
    since: "number"
  }, {
    modified_files: "object"
  })

  protocol.handle("getHashfield", {
    site: "string"
  }, {
    hashfiled_raw: "object"
  })

  protocol.handle("setHashfield", {
    site: "string",
    hasfield_raw: "object"
  }, {
    ok: "object"
  })

  protocol.handle("findHashIds", {
    site: "string",
    hash_ids: Array.isArray //with numbers
  }, {
    peers: "object",
    peers_onion: "object"
  })
}
