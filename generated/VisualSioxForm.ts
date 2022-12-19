/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export const protobufPackage = "visualsiox";

export interface Parameter {
  id: number;
  name: string;
  par: number;
}

export interface Folder {
  id: number;
  children: Folder[];
  name: string;
  parameter: Parameter | undefined;
}

function createBaseParameter(): Parameter {
  return { id: 0, name: "", par: 0 };
}

export const Parameter = {
  encode(message: Parameter, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== 0) {
      writer.uint32(8).int32(message.id);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    if (message.par !== 0) {
      writer.uint32(24).int32(message.par);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Parameter {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParameter();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.int32();
          break;
        case 2:
          message.name = reader.string();
          break;
        case 3:
          message.par = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Parameter {
    return {
      id: isSet(object.id) ? Number(object.id) : 0,
      name: isSet(object.name) ? String(object.name) : "",
      par: isSet(object.par) ? Number(object.par) : 0,
    };
  },

  toJSON(message: Parameter): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = Math.round(message.id));
    message.name !== undefined && (obj.name = message.name);
    message.par !== undefined && (obj.par = Math.round(message.par));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<Parameter>, I>>(object: I): Parameter {
    const message = createBaseParameter();
    message.id = object.id ?? 0;
    message.name = object.name ?? "";
    message.par = object.par ?? 0;
    return message;
  },
};

function createBaseFolder(): Folder {
  return { id: 0, children: [], name: "", parameter: undefined };
}

export const Folder = {
  encode(message: Folder, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== 0) {
      writer.uint32(8).int32(message.id);
    }
    for (const v of message.children) {
      Folder.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.name !== "") {
      writer.uint32(26).string(message.name);
    }
    if (message.parameter !== undefined) {
      Parameter.encode(message.parameter, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Folder {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFolder();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.int32();
          break;
        case 2:
          message.children.push(Folder.decode(reader, reader.uint32()));
          break;
        case 3:
          message.name = reader.string();
          break;
        case 4:
          message.parameter = Parameter.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Folder {
    return {
      id: isSet(object.id) ? Number(object.id) : 0,
      children: Array.isArray(object?.children) ? object.children.map((e: any) => Folder.fromJSON(e)) : [],
      name: isSet(object.name) ? String(object.name) : "",
      parameter: isSet(object.parameter) ? Parameter.fromJSON(object.parameter) : undefined,
    };
  },

  toJSON(message: Folder): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = Math.round(message.id));
    if (message.children) {
      obj.children = message.children.map((e) => e ? Folder.toJSON(e) : undefined);
    } else {
      obj.children = [];
    }
    message.name !== undefined && (obj.name = message.name);
    message.parameter !== undefined &&
      (obj.parameter = message.parameter ? Parameter.toJSON(message.parameter) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<Folder>, I>>(object: I): Folder {
    const message = createBaseFolder();
    message.id = object.id ?? 0;
    message.children = object.children?.map((e) => Folder.fromPartial(e)) || [];
    message.name = object.name ?? "";
    message.parameter = (object.parameter !== undefined && object.parameter !== null)
      ? Parameter.fromPartial(object.parameter)
      : undefined;
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
