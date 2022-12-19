dfm2json

Note that declaration of generated protobuf files must be changed for module resolution:

    From
        import * as _m0 from "protobufjs/minimal";
    To
        import _m0 from "protobufjs/minimal.js";
