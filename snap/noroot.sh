noroot() {
  [ "$(id -u)" == "0" ] && (su $(cat /etc/passwd | grep -v "/bin/false" | grep "[a-z][a-z]*:*:[0-9][0-9][0-9][0-9]:" | sed -r "s|([a-z]+).+|\1|g") --shell /bin/bash "$1" ; exit $?)
}
