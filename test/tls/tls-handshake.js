const fs = require("fs")
const path = require("path")

const cryptoEx = /self\.crypto\.add\("([a-z0-9_-]+)", [a-z0-9_-]+\)/gmi

function getMatches(string, regex, index) {
  index = index || 1 // default to the first capturing group
  var matches = []
  var match
  while ((match = regex.exec(string)))
    matches.push(match[index])
  return matches
}

const cryptos = getMatches(fs.readFileSync(path.join(__dirname, "..", "..", "lib", "protocol", "tls.js")).toString(),
  cryptoEx, 1).map(c => {
  return {
    name: c
  }
})

cryptos.forEach(crypto => {
  it("should connect via " + crypto.name, (cb) => {
    const c = new global.Client({
      target: {
        host: "localhost",
        port: crypto.name.startsWith("tls") ? 15544 : 15543
      }
    }, crypto.name.startsWith("tls") ? global.zeronetN : global.zeronetS)
    try {
      cryptos.filter(c => c.name != crypto.name).forEach(_c => c.p.crypto.disable(_c.name))
    } catch (e) {
      console.error(e)
    }
    c.handshake((err, handshake) => {
      if (err) return cb(err)
      if (handshake.commonCrypto() != crypto.name) return cb(new Error("Failing: Wrong crypto used " + handshake.commonCrypto() + " != " + crypto.name))
      else c.getFile("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", 1, err => {
        if (err) console.error("Error, but not failing the test", err)
        return cb()
      })
    })
  })
})
