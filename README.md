# ZeroNet JS

A JS version of ZeroNet, using libp2p

# About

This project was mainly created to see how the zeronet protocol can be improved and to provide better programmaticall usage of zeronet.

But it will also be compatible with zeronet-py (and will have an uiserver).

---

What works:

-   Well, nothing at the moment

Stuff that might work:

-   Basic Protocol functions (response and cmd)
-   Server (listening and accepting connections)

WIP:

-   ZeroNet Protocol
-   TLS (client => server OK, server => client TIMEOUT)

ToDo:

-   Everything else

## Notes

It is not planned to support protocol version v1. Only v2+ will be supported.

# Running

Just run `zeronet.js` and it should:

-   Launch a server on 0.0.0.0:15542
-   Connect to it

To connect to your locally running client just change the port in the `new Client` line to 15441
