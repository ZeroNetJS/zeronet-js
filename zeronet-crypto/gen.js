"use strict"

const forge = require("node-forge")
const pki = forge.pki

const attrs = [{
  name: 'commonName',
  value: 'Example Company'
}, {
  name: 'countryName',
  value: 'US'
}, {
  shortName: 'ST',
  value: 'Virginia'
}, {
  name: 'localityName',
  value: 'New York'
}, {
  name: 'organizationName',
  value: 'Example, LLC'
}, {
  shortName: 'OU',
  value: 'Test'
}]

const certSet = [{
  name: 'basicConstraints',
  cA: true
}, {
  name: 'keyUsage',
  keyCertSign: true,
  digitalSignature: true,
  nonRepudiation: true,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'extKeyUsage',
  serverAuth: true,
  clientAuth: true,
  codeSigning: true,
  emailProtection: true,
  timeStamping: true
}, {
  name: 'nsCertType',
  client: true,
  server: true,
  email: true,
  objsign: true,
  sslCA: true,
  emailCA: true,
  objCA: true
}, {
  name: 'subjectAltName',
  altNames: []
}, {
  name: 'subjectKeyIdentifier'
}]

module.exports.rsa = () => { //x509 2k rsa cert
  // generate a keypair and create an X.509v3 certificate
  var keys = pki.rsa.generateKeyPair(2048)
  var cert = pki.createCertificate()
  cert.publicKey = keys.publicKey;
  // NOTE: serialNumber is the hex encoded value of an ASN.1 INTEGER.
  // Conforming CAs should ensure serialNumber is:
  // - no more than 20 octets
  // - non-negative (prefix a '00' if your value starts with a '1' bit)
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions(certSet)
  // self-sign certificate
  cert.sign(keys.privateKey)

  // convert a Forge certificate to PEM
  var pem = pki.certificateToPem(cert)

  console.log(pem)

  return {
    cert: new Buffer(pem),
    privkey: pki.privateKeyToPem(keys.privateKey)
  }
}
module.exports.ecc=module.exports.rsa //who cares about standarts anyway, right?
