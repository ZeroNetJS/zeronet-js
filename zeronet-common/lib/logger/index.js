const bunyan = require("bunyan")

const host = require("os").hostname()
const merge = require("merge-recursive")

function Logger(config) {
  return function logger(opt) {
    if (typeof opt != "object") opt = {
      name: opt
    }
    opt = merge(opt, config)
    opt.name = "zeronet:" + opt.name
    if (process.env.LOGGER_NAME) opt.hostname = process.env.LOGGER_NAME + "@" + host
    let log = bunyan.createLogger(opt)
    let self = log.info.bind(log)
    self.logger = log
    log.level(0)

    function createFunction(type) {
      self[type] = log[type].bind(log)
    }

    createFunction("info")
    self.log = self.info
    createFunction("warn")
    createFunction("error")
    createFunction("debug")
    createFunction("trace")
    createFunction("fatal")
    return self
  }
}
module.exports = Logger
