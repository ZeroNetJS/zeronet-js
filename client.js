const client = require("./lib/client/index.js")
const c = new client({
  target: {
    host: "localhost",
    port: "15542"
  }
})
c.getFile("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", 100, console.log)
