"use strict"

const pack = require("zeronet-protocol/lib/zero/pack")
const debug = require("debug")
const log = debug("zeronet:fileserver")
const pull = require("pull-stream")
//const queue = require("pull-queue")
const FILE_CHUNK = 1024 * 512

/*
opt_def
in/out ->
  protobuf:
    (int)position:
      type, name
  strict:
    (str,fnc,Array(str,fnc))propname:
      //validator function or typeof string. one or more per def must match
*/

module.exports = function FileServer(protocol, zeronet) {
  protocol.handle("getFile", { in: {
      protobuf: {
        "1": [
          "string",
          "site"
        ],
        "2": [
          "string",
          "inner_path"
        ],
        "3": [
          "int64",
          "location"
        ]
      },
      strict: {
        site: "string",
        inner_path: "string",
        location: "number"
      }
    },
    out: {
      protobuf: {
        "1": [
          "int64",
          "size"
        ],
        "2": [
          "int64",
          "location"
        ],
        "3": [
          "bytes",
          "body"
        ]
      },
      strict: {
        size: "number",
        location: "number",
        body: Buffer.isBuffer
      }
    }
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    //FIXME: tmp hack. can be easily abused for force-seeding
    const zite = zeronet.zites[data.site]
    log("got a getFile for %s@%s", data.site, data.inner_path)
    const stream = zite.tree.storage.readStream(data.site, 0, data.inner_path)
    pull(
      stream,
      pull.collect((err, chunks) => {
        log("got OUT a getFile for %s@%s", data.site, data.inner_path, err, chunks)
        if (err) return cb(err)
        const file = Buffer.concat(chunks)
        if (file.length < data.location) return cb(new Error("Oversize"))
        return cb(null, {
          body: file.slice(data.location, data.location + FILE_CHUNK),
          location: data.location + file.slice(data.location, data.location + FILE_CHUNK).length,
          size: file.length
        })
      })
    )
  })

  protocol.handle("hasZite", { in: {
      protobuf: {
        "1": [
          "string",
          "zite"
        ]
      },
      strict: {
        "zite": "string"
      }
    },
    out: {
      protobuf: {
        "1": [
          "bool",
          "has"
        ]
      },
      strict: {
        "has": "boolean"
      }
    },
    lp2p_only: true
  }, (data, cb) => {
    return cb(null, {
      has: !!zeronet.zites[data.zite]
    })
  })

  protocol.handle("pex", { in: {
      protobuf: {
        "1": [
          "string",
          "site"
        ],
        "2": [
          "repeated string",
          "peers"
        ],
        "3": [
          "repeated string",
          "peers_onion"
        ],
        "4": [
          "int32",
          "need"
        ]
      },
      strict: {
        site: "string",
        peers: Array.isArray,
        peers_onion: d => !d || Array.isArray(d),
        need: "number"
      }
    },
    out: {
      protobuf: {
        "1": [
          "repeated string",
          "peers"
        ]
      },
      strict: {
        peers: Array.isArray
      }
    }
  }, (data, cb) => {
    if (data.peers) { //parse peers. ignore len!=6, but i think it's an encoding error instead
      let unpack = data.peers.map(p => {
        try {
          return pack.v4.unpack(p)
        } catch (e) {
          return
        }
      }).filter(v => !!v)
      log("got peers for", data.site, unpack.join(", ") || "<none>")
      zeronet.peerPool.addMany(unpack, data.site)
    }
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: parse onion peers
  })

  protocol.handle("update", { in: {
      protobuf: {
        "1": [
          "string",
          "site"
        ],
        "2": [
          "string",
          "inner_path"
        ],
        "3": [
          "string",
          "body"
        ]
      },
      strict: {
        site: "string",
        inner_path: "string",
        body: "string"
      }
    },
    out: {
      protobuf: {
        "1": [
          "string",
          "ok"
        ]
      },
      strict: {
        ok: "string"
      }
    }
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("listModified", { in: {
      protobuf: {
        "1": [
          "string",
          "site"
        ],
        "2": [
          "int64",
          "since"
        ]
      },
      strict: {
        site: "string",
        since: "number"
      }
    },
    out: {
      protobuf: {
        "1": [
          "bytes", //FIXME: need to embed (int)=val data or just use an if in the request
          "modified_files"
        ]
      },
      strict: {
        modified_files: "object"
      }
    }
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("getHashfield", { in: {
      protobuf: {
        "1": [
          "string",
          "site"
        ]
      },
      strict: {
        site: "string"
      }
    },
    out: {
      protobuf: {
        "1": [
          "string",
          "hashfield_raw"
        ]
      },
      strict: {
        hashfield_raw: "string"
      }
    }
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("setHashfield", { in: {
      protobuf: {
        "1": [
          "string",
          "site"
        ],
        "2": [
          "string",
          "hashfield_raw"
        ]
      },
      strict: {
        site: "string",
        hashfield_raw: "string"
      }
    },
    out: {
      protobuf: {
        "1": [
          "string",
          "ok"
        ]
      },
      strict: {
        ok: "string"
      }
    }
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })

  protocol.handle("findHashIds", { in: {
      protobuf: {
        "1": [
          "string",
          "site"
        ],
        "2": [
          "bytes", //FIXME: need to embed (int)=val data or just use an if in the request
          "hash_ids"
        ]
      }
    },
    out: {
      protobuf: {
        "1": [
          "repeated string",
          "peers"
        ],
        "2": [
          "repeated string",
          "peers_onion"
        ]
      },
      strict: {
        peers: Array.isArray,
        peers_onion: d => !d || Array.isArray(d),
      }
    }
  }, (data, cb) => {
    if (!zeronet.zites[data.site]) return cb(new Error("Unknown site"))
    cb("Hello. This ZeroNetJS client does not have this function implented yet. Please kindly ignore this peer.")
    //TODO: finish
  })
}
