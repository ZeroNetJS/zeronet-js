rem cmd /C .\scripts\install.cmd
rem set DEBUG_PACKETS=0
rem set INTENSE_DEBUG=0

set DEBUG=*^
,-hypercache*^
,-zeronet:node*^
,-zeronet:peer*^
,-zeronet:dial*^
,-zeronet:protocol*^
,-zeronet:protocol:client*^
,-zeronet:protocol:handshake*^
,-zeronet:swarm:nat*^
,-zeronet:zite:peer-stream:zite*^
,-bittorrent-tracker:http-tracker*^
,-bittorrent-tracker:udp-tracker*^
,-bittorrent-tracker:client*^
,-libp2p:swarm:dialer*^
,-libp2p:tcp:dial*^
,-libp2p:swarm:transport*

rem ,-zeronet:zite:file-stream*
rem ,-express*

npm start
