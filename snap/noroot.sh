noroot() {
  ID=$(id -u)
  if [ "x$ID" == "x0" ]; then
    echo "You are running as root???"
    chmod 777 -R "$PWD"
    chmod 777 -R "$SNAPCRAFT_PART_INSTALL"
    su $(cat /etc/passwd | grep -v "/bin/false" | grep "[a-z][a-z]*:*:[0-9][0-9][0-9][0-9]:" | sed -r "s|([a-z]+).+|\1|g") --shell /bin/bash "$1"
    exit $?
  fi
}
