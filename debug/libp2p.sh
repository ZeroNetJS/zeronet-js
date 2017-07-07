cmd="DEBUG=* node debug/libp2p.js"
if [ "x$1" == "xnowatch" ]; then
  eval $cmd | bunyan -l 0
  exit $?
fi
nodemon -x "$cmd" $@ | bunyan -l 0
