"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Wifi,
  WifiOff,
  Layers,
} from "lucide-react";

interface Status {
  connected?: boolean;
  tablesExist?: boolean;
  seeded?: boolean;
  userCount?: number;
  message?: string;
  error?: string;
}

interface Result {
  success?: boolean;
  message?: string;
  error?: string;
  details?: string;
  hint?: string;
  adminCredentials?: { email: string; password: string };
  memberCredentials?: { email: string; password: string };
}

export default function SetupPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const check = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/seed");
      setStatus(await r.json());
    } catch {
      setStatus({ connected: false, error: "Could not reach server" });
    } finally {
      setLoading(false);
    }
  };

  const run = async (params = "") => {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch(`/api/seed${params}`, { method: "POST" });
      const data = await r.json();
      setResult(data);
      // Re-check status after action
      setTimeout(() => check(), 500);
    } catch {
      setResult({ success: false, error: "Request failed – check console" });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  /* helper */
  const ready = status?.connected && status?.tablesExist && status?.seeded;

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-dark via-wine to-teal-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* ── header ── */}
        <div className="gradient-hero-warm p-6 text-white text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 border-2 border-amber/50 bg-white/10">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold">ማኅበረ ሥላሴ — Setup</h1>
          <p className="text-white/60 text-sm mt-1">
            Database initialisation for Vercel / Neon
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* ── status checklist ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-wine" />
                Checklist
              </h2>
              <button
                onClick={check}
                disabled={loading}
                className="text-xs text-wine hover:underline flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="bg-gray-50 rounded-xl p-4 border flex items-center gap-3 text-sm text-slate-light">
                <Loader2 className="w-5 h-5 animate-spin text-wine" />
                Checking…
              </div>
            ) : (
              <div className="space-y-2">
                {/* row 1 — connection */}
                <Row
                  ok={status?.connected}
                  okIcon={<Wifi className="w-4 h-4" />}
                  failIcon={<WifiOff className="w-4 h-4" />}
                  okText="Connected to database"
                  failText={`Cannot connect – ${status?.error || "unknown"}`}
                />
                {/* row 2 — tables */}
                {status?.connected && (
                  <Row
                    ok={status?.tablesExist}
                    okIcon={<Layers className="w-4 h-4" />}
                    failIcon={<AlertTriangle className="w-4 h-4" />}
                    okText="Tables created"
                    failText="Tables missing"
                  />
                )}
                {/* row 3 — seeded */}
                {status?.tablesExist && (
                  <Row
                    ok={status?.seeded}
                    okIcon={<CheckCircle className="w-4 h-4" />}
                    failIcon={<AlertTriangle className="w-4 h-4" />}
                    okText={`Seeded — ${status?.userCount ?? 0} users`}
                    failText="No data yet"
                  />
                )}
              </div>
            )}
          </div>

          {/* ── actions ── */}
          {!loading && (
            <div className="space-y-3">
              {/* big CTA when anything is missing */}
              {status?.connected && !ready && (
                <button
                  onClick={() => run()}
                  disabled={busy}
                  className="w-full gradient-wine text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {busy ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Database className="w-5 h-5" />
                  )}
                  🚀 One-Click Full Setup
                </button>
              )}

              {/* reset */}
              {ready && (
                <button
                  onClick={() => run("?reset=true")}
                  disabled={busy}
                  className="w-full bg-gray-100 text-slate py-3 rounded-xl font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {busy ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Reset &amp; Re-seed Database
                </button>
              )}

              {/* cannot connect */}
              {!status?.connected && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-2">
                  <p className="font-semibold">Troubleshooting</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>
                      Open <strong>Vercel → Settings → Environment Variables</strong>
                    </li>
                    <li>
                      Ensure{" "}
                      <code className="bg-red-100 px-1 rounded">DATABASE_URL</code> is
                      set
                    </li>
                    <li>
                      The value should look like:{" "}
                      <code className="bg-red-100 px-1 rounded text-[10px] break-all">
                        postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
                      </code>
                    </li>
                    <li>
                      After changing variables, <strong>redeploy</strong> your
                      project
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── result ── */}
          {result && (
            <div
              className={`rounded-xl p-4 ${
                result.success
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {result.success ? (
                <div>
                  <p className="text-emerald-700 font-semibold flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5" /> {result.message}
                  </p>
                  {result.adminCredentials && (
                    <div className="bg-white rounded-lg p-3 text-sm space-y-2">
                      <p className="font-medium text-slate">Login credentials:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-wine/5 rounded-lg p-2.5">
                          <p className="font-bold text-wine mb-1">Admin</p>
                          <p className="text-slate-light break-all">
                            {result.adminCredentials.email}
                          </p>
                          <p className="text-slate font-mono mt-0.5">
                            {result.adminCredentials.password}
                          </p>
                        </div>
                        <div className="bg-teal/5 rounded-lg p-2.5">
                          <p className="font-bold text-teal mb-1">Member</p>
                          <p className="text-slate-light break-all">
                            {result.memberCredentials?.email}
                          </p>
                          <p className="text-slate font-mono mt-0.5">
                            {result.memberCredentials?.password}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-700 text-sm">
                  <p className="font-semibold flex items-center gap-2">
                    <XCircle className="w-5 h-5 flex-shrink-0" /> {result.error}
                  </p>
                  {result.details && (
                    <pre className="mt-2 bg-red-100 rounded p-2 text-xs whitespace-pre-wrap break-all">
                      {result.details}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── nav links ── */}
          {ready && (
            <div className="border-t pt-4 space-y-2">
              <a
                href="/"
                className="block w-full gradient-wine text-white py-3 rounded-xl font-semibold hover:opacity-90 transition text-center"
              >
                Go to Homepage
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </a>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href="/login"
                  className="block bg-gray-100 text-slate py-2.5 rounded-xl font-medium hover:bg-gray-200 transition text-center text-sm"
                >
                  Login
                </a>
                <a
                  href="/admin"
                  className="block bg-gray-100 text-slate py-2.5 rounded-xl font-medium hover:bg-gray-200 transition text-center text-sm"
                >
                  Admin
                </a>
                <a
                  href="/register"
                  className="block bg-gray-100 text-slate py-2.5 rounded-xl font-medium hover:bg-gray-200 transition text-center text-sm"
                >
                  Register
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-3 text-center text-[10px] text-slate-light border-t">
          የሰበታ ዋታ ቅድስት ሥላሴ ቤተ ክርስቲያን ደጋፊ ማኅበር
        </div>
      </div>
    </div>
  );
}

/* ── small status row ── */
function Row({
  ok,
  okIcon,
  failIcon,
  okText,
  failText,
}: {
  ok?: boolean;
  okIcon: React.ReactNode;
  failIcon: React.ReactNode;
  okText: string;
  failText: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 p-3 rounded-lg text-sm ${
        ok
          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
          : "bg-amber-50 border border-amber-200 text-amber-700"
      }`}
    >
      {ok ? okIcon : failIcon}
      <span>{ok ? okText : failText}</span>
    </div>
  );
}
