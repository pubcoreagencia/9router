"use client";

import { useCallback, useEffect, useState } from "react";
import { MITM_TOOLS } from "@/shared/constants/cliTools";
import { getModelsByProviderId } from "@/shared/constants/models";
import { isOpenAICompatibleProvider, isAnthropicCompatibleProvider } from "@/shared/constants/providers";
import { MitmServerCard, MitmToolCard } from "@/app/(dashboard)/dashboard/cli-tools/components";
import { fetchJsonWithRetry } from "@/lib/frontend/fetchJsonWithRetry";

export default function MitmPageClient() {
  const [connections, setConnections] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [modelAliases, setModelAliases] = useState({});
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [expandedTool, setExpandedTool] = useState(null);
  const [mitmStatus, setMitmStatus] = useState({ running: false, certExists: false, dnsStatus: {}, hasCachedPassword: false });
  const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [prov, keys, aliases, settings] = await Promise.all([
      fetchJsonWithRetry("/api/providers"),
      fetchJsonWithRetry("/api/keys"),
      fetchJsonWithRetry("/api/models/alias"),
      fetchJsonWithRetry("/api/settings"),
    ]);
    // Apply best-effort per-collection. A failure in one resource must NOT
    // wipe data loaded for the others, and never replaces loaded data with [].
    if (prov.ok) setConnections(prov.data?.connections || []);
    if (keys.ok) setApiKeys(keys.data?.keys || []);
    if (aliases.ok) setModelAliases(aliases.data?.aliases || {});
    if (settings.ok) setCloudEnabled(!!settings.data?.cloudEnabled);
    // Surface an explicit error only if there was genuinely nothing loaded
    // (don't treat a transient failure as "no configuration exists").
    const failed = [prov, keys, aliases, settings].filter((r) => !r.ok);
    if (failed.length > 0 && !prov.ok && !keys.ok && !aliases.ok && !settings.ok) {
      setError(`Failed to load: ${failed.map((r) => r.error).join("; ")}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
      load();
    }, [load, refreshKey]);

  const getActiveProviders = () => connections.filter(c => c.isActive !== false);

  const hasActiveProviders = () => {
    const active = getActiveProviders();
    return active.some(conn =>
      getModelsByProviderId(conn.provider).length > 0 ||
      isOpenAICompatibleProvider(conn.provider) ||
      isAnthropicCompatibleProvider(conn.provider)
    );
  };

  const mitmTools = Object.entries(MITM_TOOLS);

    if (loading && connections.length === 0 && Object.keys(modelAliases).length === 0 && apiKeys.length === 0) {
      return (
        <div className="flex w-full flex-col gap-6">
          <div className="h-24 animate-pulse rounded-xl bg-border/40" />
          <div className="grid gap-3 sm:gap-4">
            {mitmTools.map(([toolId]) => (
              <div key={toolId} className="h-20 animate-pulse rounded-xl bg-border/40" />
            ))}
          </div>
        </div>
      );
    }

    if (error && connections.length === 0 && apiKeys.length === 0 && Object.keys(modelAliases).length === 0) {
      return (
        <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <span className="material-symbols-outlined text-[32px] text-red-500 mb-2">error</span>
            <p className="text-text-muted text-sm">{error}</p>
            <button
                          onClick={() => { setLoading(true); setError(null); setRefreshKey((k) => k + 1); }}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-border/40"
                        >
                          Tentar novamente
                        </button>
          </div>
        </div>
      );
    }

    return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <span className="material-symbols-outlined text-[16px] text-yellow-500 mt-0.5 shrink-0">warning</span>
        <p className="text-xs text-red-600 dark:text-yellow-400 leading-relaxed">
          ⚠️ MITM intercepts HTTPS traffic of IDE tools (Antigravity, GitHub Copilot, Kiro) via local CA to redirect requests to your providers. May violate ToS → account ban. Use at your own risk.
        </p>
      </div>

      {/* MITM Server Card */}
      <MitmServerCard
        apiKeys={apiKeys}
        cloudEnabled={cloudEnabled}
        onStatusChange={setMitmStatus}
      />

      {/* Tool Cards */}
      <div className="grid gap-3 sm:gap-4">
        {mitmTools.map(([toolId, tool]) => (
          <MitmToolCard
            key={toolId}
            tool={tool}
            isExpanded={expandedTool === toolId}
            onToggle={() => setExpandedTool(expandedTool === toolId ? null : toolId)}
            serverRunning={mitmStatus.running}
            dnsActive={mitmStatus.dnsStatus?.[toolId] || false}
            hasCachedPassword={mitmStatus.hasCachedPassword || false}
            needsSudoPassword={mitmStatus.needsSudoPassword !== false}
            isWin={mitmStatus.isWin === true}
            apiKeys={apiKeys}
            activeProviders={getActiveProviders()}
            hasActiveProviders={hasActiveProviders()}
            modelAliases={modelAliases}
            cloudEnabled={cloudEnabled}
            onDnsChange={(data) => setMitmStatus(prev => ({ ...prev, dnsStatus: data.dnsStatus ?? prev.dnsStatus }))}
          />
        ))}
      </div>
    </div>
  );
}
