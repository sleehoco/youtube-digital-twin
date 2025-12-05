'use client';

import React, { useEffect, useState } from 'react';

interface Config {
  channelUrl: string;
  limit: number;
}

interface Status {
  exists: boolean;
  chunkCount?: number;
  videoCount?: number;
  modifiedAt?: string;
}

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [config, setConfig] = useState<Config>({ channelUrl: '', limit: 10 });
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [training, setTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [configRes, statusRes] = await Promise.all([
          fetch('/api/admin/config'),
          fetch('/api/admin/status'),
        ]);
        if (configRes.ok) {
          const cfg = await configRes.json();
          setConfig(cfg);
        }
        if (statusRes.ok) {
          const st = await statusRes.json();
          setStatus(st);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword,
          channelUrl: config.channelUrl,
          limit: config.limit,
        }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('Invalid admin password');
        } else {
          setError('Failed to save config');
        }
        return;
      }
      const saved = await res.json();
      setConfig(saved);
      setSuccess('Config saved');
    } catch (e) {
      console.error(e);
      setError('Failed to save config');
    } finally {
      setSaving(false);
    }
  }

  const ingestionCommand = `./venv/Scripts/python scripts/ingest.py --channel \"${config.channelUrl}\" --limit ${config.limit}`;

  async function handleTrain() {
    setTraining(true);
    setTrainMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword,
          channelUrl: config.channelUrl,
          limit: config.limit,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        const msg = data?.message || (res.status === 401 ? 'Invalid admin password' : 'Training failed');
        setError(msg);
      } else {
        setTrainMessage(`Training complete. Chunks: ${data.chunks}, Videos: ${data.videos}`);
      }
    } catch (e) {
      console.error(e);
      setError('Training request failed');
    } finally {
      setTraining(false);
    }
  }

  // Detect if running on Vercel
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

  return (
    <div className="flex flex-col w-full max-w-2xl py-8 mx-auto px-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin Mode – YouTube Digital Twin</h1>

      {isVercel && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Running on Vercel:</strong> The "Train Now" button will work but changes are ephemeral.
                For persistent updates, run ingestion locally and push <code>knowledge_base.json</code> to git.
                See <code>VERCEL_DEPLOYMENT.md</code> for details.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && <p>Loading admin data...</p>}

      {!loading && (
        <>
          <section className="space-y-4 border rounded p-4">
            <h2 className="text-xl font-semibold">Configuration</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Admin Password</label>
                <input
                  type="password"
                  className="w-full p-2 border rounded"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">YouTube Channel URL</label>
                <input
                  className="w-full p-2 border rounded"
                  value={config.channelUrl}
                  onChange={e => setConfig({ ...config, channelUrl: e.target.value })}
                  placeholder="https://www.youtube.com/@YourChannel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Videos to Process</label>
                <input
                  type="number"
                  min={1}
                  className="w-full p-2 border rounded"
                  value={config.limit}
                  onChange={e =>
                    setConfig({ ...config, limit: Number(e.target.value) || 1 })
                  }
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Config'}
              </button>
            </form>
          </section>

          <section className="space-y-4 border rounded p-4">
            <h2 className="text-xl font-semibold">Server-side Training</h2>
            <p className="text-sm text-gray-700">
              Click the button below to fetch videos, transcripts, and generate embeddings
              using your configured API keys. This will update <code>data/knowledge_base.json</code>
              on the server. On Vercel, this data is ephemeral unless you back it with a database.
            </p>
            <button
              type="button"
              onClick={handleTrain}
              disabled={training || !adminPassword}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {training ? 'Training...' : 'Train Now'}
            </button>
            {trainMessage && (
              <p className="text-green-700 text-sm">{trainMessage}</p>
            )}
          </section>

          <section className="space-y-4 border rounded p-4">
            <h2 className="text-xl font-semibold">Training Instructions (Local, Optional)</h2>
            <p className="text-sm text-gray-700">
              You can still run training locally if you prefer:
            </p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {ingestionCommand}
            </pre>
            <p className="text-sm text-gray-700">
              After running the command, commit and push the updated{' '}
              <code>data/knowledge_base.json</code> file so that your Vercel
              deployment uses the new knowledge.
            </p>
          </section>

          <section className="space-y-2 border rounded p-4">
            <h2 className="text-xl font-semibold">Knowledge Base Status</h2>
            {!status?.exists && (
              <p className="text-sm text-red-600">
                No <code>data/knowledge_base.json</code> file found yet. Run the
                ingestion command above.
              </p>
            )}
            {status?.exists && (
              <div className="text-sm text-gray-800 space-y-1">
                <p>
                  <span className="font-medium">Chunks:</span>{' '}
                  {status.chunkCount}
                </p>
                <p>
                  <span className="font-medium">Videos:</span>{' '}
                  {status.videoCount}
                </p>
                {status.modifiedAt && (
                  <p>
                    <span className="font-medium">Last Updated:</span>{' '}
                    {new Date(status.modifiedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
