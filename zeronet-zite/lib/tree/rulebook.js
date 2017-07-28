const crypto = require("zeronet-crypto")

/*
# The valid signers of content.json file
# Return: ["1KRxE1s3oDyNDawuYWpzbLUwNm8oDbeEp6", "13ReyhCsjhpuCVahn1DHdf6eMqqEVev162"]
def getValidSigners(self, inner_path, content=None):
    valid_signers = []
    if inner_path == "content.json":  # Root content.json
        if "content.json" in self.contents and "signers" in self.contents["content.json"]:
            valid_signers += self.contents["content.json"]["signers"][:]
    else:
        rules = self.getRules(inner_path, content)
        if rules and "signers" in rules:
            valid_signers += rules["signers"]

    if self.site.address not in valid_signers:
        valid_signers.append(self.site.address)  # Site address always valid
    return valid_signers

# Get rules for the file
# Return: The rules for the file or False if not allowed
def getRules(self, inner_path, content=None):
    if not inner_path.endswith("content.json"):  # Find the files content.json first
        file_info = self.getFileInfo(inner_path)
        if not file_info:
            return False  # File not found
        inner_path = file_info["content_inner_path"]

    if inner_path == "content.json": # Root content.json
        rules = {}
        rules["signers"] = self.getValidSigners(inner_path, content)
        return rules

    dirs = inner_path.split("/")  # Parent dirs of content.json
    inner_path_parts = [dirs.pop()]  # Filename relative to content.json
    inner_path_parts.insert(0, dirs.pop())  # Dont check in self dir
    while True:
        content_inner_path = "%s/content.json" % "/".join(dirs)
        parent_content = self.contents.get(content_inner_path.strip("/"))
        if parent_content and "includes" in parent_content:
            return parent_content["includes"].get("/".join(inner_path_parts))
        elif parent_content and "user_contents" in parent_content:
            return self.getUserContentRules(parent_content, inner_path, content)
        else:  # No inner path in this dir, lets try the parent dir
            if dirs:
                inner_path_parts.insert(0, dirs.pop())
            else:  # No more parent dirs
                break

    return False

  def verifyCert(self, inner_path, content):
      from Crypt import CryptBitcoin

      rules = self.getRules(inner_path, content)

      if not rules.get("cert_signers"):
          return True  # Does not need cert

      if not "cert_user_id" in content:
          raise VerifyError("Missing cert_user_id")

      name, domain = content["cert_user_id"].split("@")
      cert_address = rules["cert_signers"].get(domain)
      if not cert_address:  # Cert signer not allowed
          raise VerifyError("Invalid cert signer: %s" % domain)

      try:
          cert_subject = "%s#%s/%s" % (rules["user_address"], content["cert_auth_type"], name)
          result = CryptBitcoin.verify(cert_subject, cert_address, content["cert_sign"])
      except Exception, err:
          raise VerifyError("Certificate verify error: %s" % err)
      return result

*/



/**
 * A rule book defines which and how many keys can/have to sign
 * @namespace RuleBook
 * @constructor
 */
function RuleBook(opt) {
  const self = this

  self.valid_keys = opt.valid_keys
  self.signers_required = opt.signers_required

  self.isKeyAllowed = key => self.validKeys.indexOf(key) != -1
  self.getSignersRequired = () => self.signers_required
  self.getValidKeys = () => self.validKeys
  self.verifySignature = (data, sig) => {

  }
  self.createSubBook = opt => {
    //let book = new RuleBook()
  }
}

module.exports = RuleBook
