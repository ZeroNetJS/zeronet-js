module.exports = function ip2long (argIP) {
  // ip2long('192.0.34.166') returns 3221234342
  // ip2long('0.0xABCDEF') returns 11259375
  // ip2long('255.255.255.256') returns false

  let i = 0
  const pattern = new RegExp([
    '^([1-9]\\d*|0[0-7]*|0x[\\da-f]+)',
    '(?:\\.([1-9]\\d*|0[0-7]*|0x[\\da-f]+))?',
    '(?:\\.([1-9]\\d*|0[0-7]*|0x[\\da-f]+))?',
    '(?:\\.([1-9]\\d*|0[0-7]*|0x[\\da-f]+))?$'
  ].join(''), 'i')

  argIP = argIP.match(pattern) // verify argIP format
  if (!argIP) {
    return false // invalid format
  }
  argIP[0] = 0 // reuse argIP 
  for (i = 1; i < 5; i += 1) {
    argIP[0] += !!((argIP[i] || '').length)
    argIP[i] = parseInt(argIP[i]) || 0
  }
  argIP.push(256, 256, 256, 256)
  argIP[4 + argIP[0]] *= Math.pow(256, 4 - argIP[0])
  if (argIP[1] >= argIP[5] ||
    argIP[2] >= argIP[6] ||
    argIP[3] >= argIP[7] ||
    argIP[4] >= argIP[8]) {
    return false
  }
  return argIP[1] * (argIP[0] === 1 || 16777216) +
    argIP[2] * (argIP[0] <= 2 || 65536) +
    argIP[3] * (argIP[0] <= 3 || 256) +
    argIP[4] * 1
}
