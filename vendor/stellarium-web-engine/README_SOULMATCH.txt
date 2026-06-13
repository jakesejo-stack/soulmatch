This folder is prepared for the official Stellarium Web Engine build files.

Full engine source: https://github.com/Stellarium/stellarium-web-engine
To run the raw engine locally you need the generated files:
- stellarium-web-engine.js
- stellarium-web-engine.wasm
- required data/static assets

The current /livesky/ path uses the official Stellarium Web embed so it works immediately on localhost.
When the engine build files are added here, /livesky/livesky.js can be upgraded to direct WebGL engine control instead of iframe mode.
