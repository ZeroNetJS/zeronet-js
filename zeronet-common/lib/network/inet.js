// ip4 example: 192.168.2.1
module.exports.aton = function inet_aton(ip) {
  // split into octets
  var a = ip.split('.')
  var buffer = new ArrayBuffer(4)
  var dv = new DataView(buffer)
  for (var i = 0; i < 4; i++) {
    dv.setUint8(i, a[i])
  }
  return (dv.getUint32(0))
}

// num example: 3232236033
module.exports.ntoa = function inet_ntoa(num) {
  var nbuffer = new ArrayBuffer(4)
  var ndv = new DataView(nbuffer)
  ndv.setUint32(0, num)

  var a = []
  for (var i = 0; i < 4; i++) {
    a[i] = ndv.getUint8(i)
  }
  return a.join('.')
}

module.exports.ntop = function inet_ntop(a) { // eslint-disable-line camelcase
  // inet_ntop('\x7F\x00\x00\x01') returns '127.0.0.1'
  // inet_ntop('\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\1') returns '::1'

  var i = 0
  var m = ''
  var c = []

  a += ''
  if (a.length === 4) {
    // IPv4
    return [
      a.charCodeAt(0),
      a.charCodeAt(1),
      a.charCodeAt(2),
      a.charCodeAt(3)
    ].join('.')
  } else if (a.length === 16) {
    // IPv6
    for (i = 0; i < 16; i++) {
      c.push(((a.charCodeAt(i++) << 8) + a.charCodeAt(i)).toString(16))
    }
    return c.join(':')
      .replace(/((^|:)0(?=:|$))+:?/g, function (t) {
        m = (t.length > m.length) ? t : m
        return t
      })
      .replace(m || ' ', '::')
  } else {
    return false // invalid length
  }
}

module.exports.pton = function inet_pton(a) {
  // inet_pton('::') returns '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'
  // inet_pton('127.0.0.1') returns '\x7F\x00\x00\x01'

  var r, m, x, i, j
  var f = String.fromCharCode

  // IPv4
  m = a.match(/^(?:\d{1,3}(?:\.|$)){4}/)
  if (m) {
    m = m[0].split('.')
    m = f(m[0]) + f(m[1]) + f(m[2]) + f(m[3])
    // Return if 4 bytes, otherwise false.
    return m.length === 4 ? m : false
  }
  r = /^((?:[\da-f]{1,4}(?::|)){0,8})(::)?((?:[\da-f]{1,4}(?::|)){0,8})$/

  // IPv6
  m = a.match(r)
  if (m) {
    // Translate each hexadecimal value.
    for (j = 1; j < 4; j++) {
      // Indice 2 is :: and if no length, continue.
      if (j === 2 || m[j].length === 0) {
        continue
      }
      m[j] = m[j].split(':')
      for (i = 0; i < m[j].length; i++) {
        m[j][i] = parseInt(m[j][i], 16)
        // Would be NaN if it was blank, return false.
        if (isNaN(m[j][i])) {
          return false // invalid IP
        }
        m[j][i] = f(m[j][i] >> 8) + f(m[j][i] & 0xFF)
      }
      m[j] = m[j].join('')
    }
    x = m[1].length + m[3].length
    if (x === 16) {
      return m[1] + m[3]
    } else if (x < 16 && m[2].length > 0) {
      return m[1] + (new Array(16 - x + 1))
        .join('\x00') + m[3]
    }
  }
  return false // invalid IP
}
