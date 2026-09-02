import fs from "node:fs";
import path from "node:path";
import {
  ACCOUNT_LAYOUTS,
  ACCOUNT_NAMES,
  DecodeError,
  EVENT_LAYOUTS,
  EVENT_NAMES,
  decodeLayout,
  discriminator,
  type AccountName,
  type Decoded,
} from "./codec";

export interface DecodedAccount {
  name: AccountName;
  data: Decoded;
}
export interface DecodedEvent {
  name: string;
  data: Decoded;
}

export interface VaultDecoder {
  readonly source: "spec" | "idl";
  readonly idlAddress: string | null;
  accountDiscriminator(name: AccountName): Buffer;
  decodeAccount(data: Buffer): DecodedAccount | null;
  decodeEvent(data: Buffer): DecodedEvent | null;
}