// Seed the `fullstack-free` combo — a hierarchical autorouter over
// free OpenRouter LLMs (best → weakest). Registered in DB so the
// dashboard + combo handler pick it up automatically on first boot.
// Order matters: this is the autorouting tier list.
import { stringifyJson } from "../helpers/jsonCol.js";

export const FULLSTACK_FREE_MODELS = [
  "openrouter/nvidia/nemotron-3.5-super-vl:free",
  "openrouter/nvidia/nemotron-3.5-super-vl:free",
  "openrouter/thinkingmachines/inkling:free",
  "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",
  "openrouter/google/gemma-4-31b-it:free",
  "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter/poolside/laguna-s-2.1:free",
  "openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "openrouter/google/gemma-4-26b-a4b-it:free",
  "openrouter/nvidia/nemotron-3.5-lightning:free",
  "openrouter/poolside/laguna-xs-2.1:free",
  "openrouter/xingchen-agi/xing4.0-29b-a4b:free",
  "openrouter/recursive/flint-v1.0:free",
  "openrouter/dots-studio/dots-3-note-preview:free",
  "openrouter/thinkingmachines/inkling-small:free",
  "openrouter/cohere/north-mini-code:free",
];

export default {
  version: 2,
  name: "seed-fullstack-free-combo",
  up(db) {
    const existing = db.get(`SELECT id FROM combos WHERE name = ?`, ["fullstack-free"]);
    if (existing) return;

    const now = new Date().toISOString();
    db.run(
      `INSERT INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
      ["fullstack-free", "fullstack-free", "autorouting", stringifyJson(FULLSTACK_FREE_MODELS), now, now]
    );
  },
};
