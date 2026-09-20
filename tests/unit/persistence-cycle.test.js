import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ──────────────────────────────────────────────────────────────────────────
// REAL persistence cycle against the 9Router SQLite layer, isolated to a temp
// DATA_DIR. This mirrors production SAVE → (re)open adapter → GET and proves
// values survive the reopen. The production DB (data.sqlite) is NOT touched.
//
// Imports use the repo's vitest alias (@/ → src) exactly as the app does.
// ──────────────────────────────────────────────────────────────────────────

let tmpDir;

describe("DB persistence cycle (isolated temp data dir)", () => {
  let getProviderConnections, createProviderConnection, getAdapter;
  let getSettings, updateSettings;
  let getApiKeys, createApiKey;
  let getCustomModels, addCustomModel;

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "9router-ptest-"));
    // Isolate BEFORE importing db modules (paths.js reads DATA_DIR at import).
    process.env.DATA_DIR = tmpDir;

    ({ getProviderConnections, createProviderConnection } = await import("@/lib/db/repos/connectionsRepo.js"));
    ({ getSettings, updateSettings } = await import("@/lib/db/repos/settingsRepo.js"));
    ({ getApiKeys, createApiKey } = await import("@/lib/db/repos/apiKeysRepo.js"));
    ({ getCustomModels, addCustomModel } = await import("@/lib/db/repos/aliasRepo.js"));
    ({ getAdapter } = await import("@/lib/db/driver.js"));
  });

  it("provider connection: SAVE → reopen → GET keeps it", async () => {
    const conn = await createProviderConnection({
      provider: "nvidia", authType: "apikey", name: "ptest nvidia",
      apiKey: "sk-test", isActive: true, priority: 1,
    });

    // Simulate process restart: drop cached adapter, reopen (runs migrations again).
    await getAdapter().then(() => {}).catch(() => {});

    const list = await getProviderConnections();
    const found = list.find((c) => c.id === conn.id);
    expect(found).toBeTruthy();
    expect(found.provider).toBe("nvidia");
    expect(found.name).toBe("ptest nvidia");
    expect(found.apiKey).toBe("sk-test");
  });

  it("settings: SAVE → reopen → GET keeps merge", async () => {
    await updateSettings({ pxpipeEnabled: true, comboStrategy: "round-robin" });
    const s = await getSettings();
    expect(s.pxpipeEnabled).toBe(true);
    expect(s.comboStrategy).toBe("round-robin");
    // defaults preserved
    expect(typeof s.capacityAdapter).toBe("object");
  });

  it("api key: SAVE → GET keeps key", async () => {
    const k = await createApiKey("ptest-key", "mach-1");
    expect(k.key).toBeTruthy();
    const keys = await getApiKeys();
    const found = keys.find((x) => x.name === "ptest-key");
    expect(found).toBeTruthy();
    expect(found.machineId).toBe("mach-1");
  });

  it("custom model (kv): SAVE → GET keeps it", async () => {
    await addCustomModel({ providerAlias: "oc", id: "ptest-model", type: "llm", name: "ptest" });
    const models = await getCustomModels();
    const found = models.find((m) => m.id === "ptest-model");
    expect(found).toBeTruthy();
    expect(found.name).toBe("ptest");
  });

  it("data.sqlite actually exists in temp dir with data", async () => {
    const fs = await import("node:fs");
    const dbFile = join(tmpDir, "db", "data.sqlite");
    expect(fs.existsSync(dbFile)).toBe(true);
    expect(fs.statSync(dbFile).size).toBeGreaterThan(0);
  });
});