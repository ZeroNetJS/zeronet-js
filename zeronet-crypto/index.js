"use strict"

const crypto = require("crypto")
const ec = require("secp256k1")
const clone = require("clone")

function OrderObject(unordered) {
  const ordered = {}
  Object.keys(unordered).sort().forEach(function (key) {
    ordered[key] = typeof unordered[key] == "object" ? OrderObject(unordered[key]) : unordered[key]
  })
  return ordered
}

const chr = String.fromCharCode

/*
def encode(val, base, minlen=0):
    base, minlen = int(base), int(minlen)
    code_string = ''.join([chr(x) for x in range(256)])
    result = ""
    while val > 0:
        result = code_string[val % base] + result
        val //= base
    return code_string[0] * max(minlen - len(result), 0) + result


def num_to_var_int(x):
    x = int(x)
    if x < 253:
        return chr(x)
    elif x < 65536:
        return chr(253) + encode(x, 256, 2)[::-1]
    elif x < 4294967296:
        return chr(254) + encode(x, 256, 4)[::-1]
    else:
        return chr(255) + encode(x, 256, 8)[::-1]


def msg_magic(message):
    return "\x18Bitcoin Signed Message:\n" + num_to_var_int(len(message)) + message
*/
/*
function GVIencode(val, base, minlen) {
  if (!minlen) minlen = 0

  let code_string = ""

  let i = 0

  while (i != 256) {
    code_string += chr(i)
    i++
  }

  let result = ""
  while (val > 0) {
    result = code_string[val % base] + result
    val = Math.floor(val / base)
  }
  return code_string[0].repeat(minlen - result.length > 0 ? minlen - result.length : 0) + result
}

function GetVarInt(x) {
  if (x < 253)
    return chr(x)
  else if (x < 65536)
    return chr(253) + GVIencode(x, 256, 2).split("").reverse()
  else if (x < 4294967296)
    return chr(254) + GVIencode(x, 256, 4).split("").reverse()
  else
    return chr(255) + GVIencode(x, 256, 8).split("").reverse()
}

function MessageMagic(data) {
  return "\x18Bitcoin Signed Message:\n" + GetVarInt(data.length) + data
}

function GetPubKey(data, sign) {
  data = MessageMagic(data)
  console.log(data)
  return ec.recover(new Buffer(data), new Buffer(sign))
  //return ec.recover(data, sign)
}

function VerifySignature(key, data, sign) {
  return ec.verify(data, sign, key)
}*/

function VerifySig(address, data, sig) {
  return btcMessage.verify(data, "\x18Bitcoin Signed Message:\n", address, sig)
}

const btcMessage = require("bitcoinjs-message")

function KeyToAddress(key) {
  //TODO: add
}

function JSONBlock(data) {
  return JSON.stringify(OrderObject(data))
}

function GetValidSigners(address, inner_path, data) {
  let valid_signers = []
  if (inner_path == "content.json") {
    if (data.signers) valid_signers = Object.keys(data.signers)
  } else {
    //TODO: multi-user
  }
  if (valid_signers.indexOf(address) == -1) valid_signers.push(address) //Address is always a valid signer
  return valid_signers
}

function GetSigners(vs, sr) {
  return sr + ":" + vs.join(",")
}

function VerifyContentJSON(address, inner_path, data) {
  /*
  data is an object.
  we need to get the signing data from the object and remove the signs
  it's keys need to be sorted alphapetically and then stringified without withespace
  */
  const {
    signs,
    signs_required,
    signers_sign
  } = data

  delete data.signs
  delete data.signers_sign

  const real = JSONBlock(data) //the data that was actually signed
  const sigsig = signers_sign //signers_sign
  const vs = GetValidSigners(address, inner_path, data) //valid signers
  const sigsigdata = GetSigners(vs, signs_required) //signers_sign data

  if (!VerifySig(address, sigsigdata, sigsig)) throw new Error("Invalid signers_sign or signers")

  let vss = 0 //valid signs found

  vs.forEach(addr => {
    if (vss < signs_required) {
      console.log(addr, real, signs[addr])
      if (VerifySig(addr, real, signs[addr])) vss++
    }
  })

  if (vss < signs_required) throw new Error("Found " + vss + " vaild signs but " + signs_required + " are needed")

  return true

}

module.exports = {
  OrderObject,
  VerifyContentJSON,
  //  GetPubKey,
  VerifySig,
  KeyToAddress,
  JSONBlock,
  GetValidSigners,
  GetSigners,
  //  GetVarInt
}
