"""The whole app on the laptop (MA-198, ARCHITECTURE §17): moto for AWS, one local ASGI app, and a replaying agent.

Nothing here ships. It sits outside `backend/src`, so no deployed image can contain the sign-in stub or these stand-ins
for the chat api and the stream, which MA-30, MA-31 and MA-266 replace with the real handlers, keeping the same wire.
"""
