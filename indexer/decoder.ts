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