"use strict"

const ip = require("ip")
const assert = require("assert")

function ip2multi(ip, proto) {
  ip = ip2multi.split(ip)
  return "/ip" + ip.v + "/" + ip.ip + "/" + proto + "/" + ip.port + "/"
}

ip2multi.split = ipHost => {
  let s = ipHost.split(":")
  s = [s.pop(), s.join(":")].reverse()
  assert.equal(s.length, 2, "not host:port")
  let r = {
    ip: s[0],
    port: parseInt(s[1], 10)
  }
  assert(!isNaN(r.port), "not a valid port")
  assert(ip.isV4Format(r.ip) || ip.isV6Format(r.ip), "not a valid ip")
  if (ip.isV4Format(r.ip)) r.v = 4
  else if (ip.isV6Format(r.ip)) r.v = 6

  return r
}

ip2multi.isIp = ipHost => {
  try {
    ip2multi.split(ipHost)
    return true
  } catch (e) {
    return false
  }
}

ip2multi.reverse4 = multi => multi.split("/").slice(2).filter(a => a != "tcp").join(":")

module.exports = ip2multi
