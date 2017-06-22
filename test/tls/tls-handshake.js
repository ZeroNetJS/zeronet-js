it("should connect via tls handshake", (cb) => {
  const c = new global.Client({
    target: {
      host: "localhost",
      port: 15543
    }
  }, zeronet)
  c.handshake((err, handshake) => {
    if (!handshake.commonCrypto()) return cb(new Error("Test: No tls was used"))
    if (err) return cb(err)
    else c.getFile("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", 1, err => {
      if (err) console.error("Error, but not failing the test", err)
      return cb()
    })
  })
})
