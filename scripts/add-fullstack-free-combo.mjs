/**
 * Adds a `fullstack-free` combo to the 9router DB with a hierarchical routing
 * list of free OpenRouter models (best → weakest). Uses the built-in DB
 * import/export so we never touch the SQLite file directly.
 *
 * Run: node scripts/add-fullstack-free-combo.mjs
 */
import { exportDb, importDb } from "../src/lib/db/index.js";

// Fullstack-free OpenRouter models, ordered by power (best → weakest).
// Excluded: content-safety (nvidia/...-content-safety:free), 2.6B (liquid/lfm-2.5-2.6b:free)
const FULLSTACK_FREE_MODELS = [
  "openrouter/nvidia/nemotron-3.5-super-vl:free",          // 550B, text+image+video, 1M ctx — TOP
  "openrouter/thinkingmachines/inkling:free",              // multimodal premium, 1M ctx
  "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",    // 550B text-only, 1M ctx
  "openrouter/google/gemma-4-31b-it:free",               // 31B multimodal, 256K
  "openrouter/nvidia/nemotron-3-super-120b-a12b:free",    // 120B text, 256K
  "openrouter/poolside/laguna-s-2.1:free",                // Poolside flagship, 256K
  "openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", // 30B multimodal omni, 256K
  "openrouter/google/gemma-4-26b-a4b-it:free",            // 26B multimodal, 256K
  "openrouter/nvidia/nemotron-3.5-lightning:free",        // fast variant, 1M ctx
  "openrouter/poolside/laguna-xs-2.1:free",               // 256K
  "openrouter/xingchen-agi/xing4.0-29b-a4b:free",          // 29B, 256K
  "openrouter/recursive/flint-v1.0:free",                  // 256K
  "openrouter/dots-studio/dots-3-note-preview:free",       // preview, 512K
  "openrouter/thinkingmachines/inkling-small:free",       // small, 1M
  "openrouter/cohere/north-mini-code:free",               // code-focused, 256K
];

async function main() {
  console.log("Exporting current DB...");
  const payload = await exportDb();

  // Remove any existing combo with same name to keep idempotent
  if (Array.isArray(payload.combos)) {
    payload.combos = payload.combos.filter((c) => c.name !== "fullstack-free");
  } else {
    payload.combos = [];
  }

  // Append the new combo
  payload.combos.push({
    id: "fullstack-free",
    name: "fullstack-free",
    kind: "autorouting",
    models: FULLSTACK_FREE_MODELS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Importing DB with ${FULLSTACK_FREE_MODELS.length} models in combo "fullstack-free"...`);
  const result = await importDb(payload);
  const combo = (result.combos || []).find((c) => c.name === "fullstack-free");
  if (!combo) throw new Error("Combo not found after import — something went wrong");
  console.log("✅ Success. Combo registered:");
  console.log(JSON.stringify(combo, null, 2));
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
