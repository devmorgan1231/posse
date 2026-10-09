import { test } from "node:test";
import path from "node:path";
import { liteSvmChain } from "./chain.ts";
import { SCENARIOS, setup, type Ctx } from "./scenarios.ts";

const so = process.env.POSSE_SO || path.resolve(import.meta.dirname, "../../target/deploy/posse_vault.so");
let ctx: Ctx;

test("litesvm setup (config: upgrade-authority init, fee ceiling)", async () => {
  const chain = await liteSvmChain(so);
  ctx = await setup(chain, (s) => console.log(`# ${s}`));
});

for (const [name, fn] of SCENARIOS) test(name, async () => fn(ctx));
