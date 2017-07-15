"use strict"

const express = require("express")
const verify = require("zeronet-common/lib/verify")
const Zite = require("zeronet-zite")

function URLParser(url) {
  let s = url.split("/")
  return {
    zite: s[1],
    inner_path: s.slice(2).join("/")
  }
}

const fs = require("fs")
const path = require("path")

function getMatches(string, regex, index) {
  index = index || 1 // default to the first capturing group
  var matches = []
  var match
  while ((match = regex.exec(string)))
    matches.push(match[index])
  return matches
}

function UI(zeronet) {
  const uipath = path.join(__dirname, "..", "ui")
  const ui = fs.readFileSync(path.join(uipath, "template", "wrapper.html")).toString()

  const need_replace = getMatches(ui, /{([a-z_]+)}/g)

  function generateUI(values) {
    const vals = Object.keys(values)
    const missing = need_replace.filter(val => vals.indexOf(val) == -1)
    if (missing.length) throw new Error("Value(s) not set: " + missing.join(", "))
    let wrapper = ui
    for (var p in values)
      wrapper = wrapper.replace(new RegExp("{" + p + "}", "g"), values[p])
    return wrapper
  }

  function handleGet(req, res /*, next*/ ) {
    //TODO: fix values
    //FIXME: escaping
    const nonce = req.zite.getNonce(req.inner_path)
    const v = {
      rev: zeronet.rev,
      title: req.zite.address,
      address: req.zite.address,
      permissions: "\"" + JSON.stringify(["ADMIN"]) + "\"", //FIXME: security
      wrapper_key: req.zite.config.wrapper_key,
      wrapper_nonce: nonce,
      homepage: "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
      meta_tags: "",
      file_inner_path: req.inner_path,
      postmessage_nonce_security: true,
      file_url: ["", req.zite.address, req.inner_path].join("/"),
      query_string: "?wrapper_nonce=" + nonce,
      lang: "en",
      show_loadingscreen: true,
      server_url: req.protocol + '://' + req.get('host'),
      body_style: "background: #AFAFAF",
      sandbox_permissions: ""
    }
    return res.send(generateUI(v))
  }

  //this.gen = generateUI
  this.handleGet = handleGet
  this.handler = express.static(path.join(uipath, "media")) //TODO: add translation, etc
  this.roothandler = express.static(path.join(uipath, "root"))
}

module.exports = function UiServer(config, zeronet) {
  const log = zeronet.logger("uiserver")
  const app = express()
  const self = this

  const ui = new UI(zeronet)

  app.use("/", ui.roothandler)
  app.use("/uimedia", ui.handler)

  app.use((req, res, next) => {
    if (req.url == "/") return res.redirect("/1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")
    req.zurl = URLParser(req.url)
    return next()
  })

  //app.use(namecoinHandler)

  app.use((req, res, next) => {
    if (verify.verifyAddress(req.zurl.zite)) {
      if (!zeronet.zites[req.zurl.zite]) {
        new Zite({
          address: req.zurl.zite
        }, zeronet)
      }

      req.zite = zeronet.zites[req.zurl.zite]
      req.inner_path = req.zurl.inner_path

      if (req.query.wrapper_nonce) {
        req.zite.handleGet(req, res, next)
      } else {
        ui.handleGet(req, res, next)
      }
    } else {
      return next(new Error("Invalid address"))
    }
  })

  self.start = cb => {
    log.debug(config.listen, "starting")
    app.listen(config.listen, err => {
      if (err) log.error(err, "Failed to listen")
      else log(config.listen, "Listening on %s:%s", config.listen.host, config.listen.port)
      return cb(err)
    })
  }

  self.stop = cb => cb() //TODO: add
}
