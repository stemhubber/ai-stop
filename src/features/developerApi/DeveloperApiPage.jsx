import { useCallback, useEffect, useState } from "react";
import { AppLayout, Button, EmptyState, Icon, LoadingScreen, Modal, PageHeader, Toast } from "../websites/components/WebiloUI";
import { UsageMeter } from "../plans/PlanUI";
import {
  createApiKey,
  createDeveloperProject,
  getProjectUsage,
  listApiKeys,
  listDeveloperProjects,
  revokeApiKey,
} from "../../services/developerApiService";
import "./developerApi.css";

const ENVIRONMENTS = [
  { id: "live", label: "Production", description: "Real sends, counts against your live rate limit." },
  { id: "test", label: "Development", description: "For local/staging integration work." },
];

const USAGE_METRICS = [
  { id: "requests", label: "API requests", description: "Every /v1 call, successful or not" },
  { id: "emails", label: "Emails sent", description: "Via /v1/email" },
  { id: "sms", label: "SMS sent", description: "Via /v1/sms" },
  { id: "whatsapp", label: "WhatsApp sent", description: "Via /v1/whatsapp" },
];

export default function DeveloperApiPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [tab, setTab] = useState("keys");
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await listDeveloperProjects();
      setProjects(data);
      setActiveProjectId((current) => (current && data.some((p) => p.id === current) ? current : data[0]?.id || null));
      setLoadError(null);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const activeProject = projects.find((project) => project.id === activeProjectId) || null;

  if (loading) return <LoadingScreen label="Loading Webilo APIs" />;

  return (
    <AppLayout>
      <main className="dev-api-page">
        <PageHeader
          eyebrow="Webilo APIs"
          title="Developer API"
          description="Send email, SMS, and WhatsApp from your own apps through the same messaging infrastructure Webilo uses internally."
        />

        {loadError && <p className="dev-api-error">{loadError}</p>}

        <ProjectPicker
          projects={projects}
          activeProjectId={activeProjectId}
          onSelect={setActiveProjectId}
          onCreated={(project) => {
            setProjects((prev) => [...prev, project]);
            setActiveProjectId(project.id);
            setToast({ message: `Created project "${project.name}"`, tone: "success" });
          }}
          onError={(message) => setToast({ message, tone: "error" })}
        />

        {!activeProject && (
          <EmptyState
            icon="site"
            title="Create a project to get started"
            body="A project holds its own API keys and usage. Create one above, then issue a key to start calling /v1/email, /v1/sms, or /v1/whatsapp."
          />
        )}

        {activeProject && (
          <>
            <nav className="dev-api-tabs" aria-label="Developer API sections">
              {[
                { id: "keys", label: "API keys" },
                { id: "usage", label: "Usage" },
                { id: "billing", label: "Billing" },
              ].map((section) => (
                <button
                  key={section.id}
                  className={tab === section.id ? "active" : ""}
                  onClick={() => setTab(section.id)}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </nav>

            {tab === "keys" && (
              <ApiKeysPanel
                project={activeProject}
                onToast={(t) => setToast(t)}
              />
            )}
            {tab === "usage" && <UsagePanel project={activeProject} onToast={(t) => setToast(t)} />}
            {tab === "billing" && <BillingPanel />}
          </>
        )}
      </main>
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </AppLayout>
  );
}

function ProjectPicker({ projects, activeProjectId, onSelect, onCreated, onError }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const project = await createDeveloperProject(trimmed);
      setName("");
      onCreated(project);
    } catch (error) {
      onError(error.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="dev-api-projects">
      {projects.length > 0 && (
        <div className="dev-api-projects__list" role="tablist" aria-label="Projects">
          {projects.map((project) => (
            <button
              key={project.id}
              className={project.id === activeProjectId ? "active" : ""}
              onClick={() => onSelect(project.id)}
              role="tab"
              aria-selected={project.id === activeProjectId}
              type="button"
            >
              {project.name}
            </button>
          ))}
        </div>
      )}
      <form className="dev-api-projects__create" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New project name (e.g. Study Acumen)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
        />
        <Button variant="default" size="sm" icon="plus" disabled={creating || !name.trim()}>
          {creating ? "Creating…" : "New project"}
        </Button>
      </form>
    </section>
  );
}

function ApiKeysPanel({ project, onToast }) {
  const [keys, setKeys] = useState(null);
  const [environment, setEnvironment] = useState("test");
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const loadKeys = useCallback(async () => {
    try {
      const { data } = await listApiKeys(project.id);
      setKeys(data);
    } catch (error) {
      onToast({ message: error.message, tone: "error" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useEffect(() => {
    setKeys(null);
    loadKeys();
  }, [loadKeys]);

  async function handleCreateKey(event) {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await createApiKey(project.id, { name: keyName.trim() || undefined, environment });
      setNewKey(created);
      setKeyName("");
      await loadKeys();
    } catch (error) {
      onToast({ message: error.message, tone: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    try {
      await revokeApiKey(project.id, revokeTarget.id);
      onToast({ message: `Revoked ${revokeTarget.keyPrefix}…`, tone: "success" });
      setRevokeTarget(null);
      await loadKeys();
    } catch (error) {
      onToast({ message: error.message, tone: "error" });
    }
  }

  function copyKey() {
    navigator.clipboard?.writeText(newKey.key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="dev-api-keys">
      <form className="dev-api-keys__create" onSubmit={handleCreateKey}>
        <div className="dev-api-env-toggle" role="radiogroup" aria-label="Key environment">
          {ENVIRONMENTS.map((env) => (
            <button
              key={env.id}
              type="button"
              className={environment === env.id ? "active" : ""}
              onClick={() => setEnvironment(env.id)}
              role="radio"
              aria-checked={environment === env.id}
              title={env.description}
            >
              {env.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Key name (optional)"
          value={keyName}
          onChange={(event) => setKeyName(event.target.value)}
          maxLength={80}
        />
        <Button variant="primary" size="sm" icon="plus" disabled={creating}>
          {creating ? "Creating…" : "Create API key"}
        </Button>
      </form>

      {keys === null && <p className="dev-api-hint">Loading keys…</p>}
      {keys && keys.length === 0 && (
        <p className="dev-api-hint">No API keys yet — create one above to start calling /v1/email, /v1/sms, or /v1/whatsapp.</p>
      )}
      {keys && keys.length > 0 && (
        <table className="dev-api-keys__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Environment</th>
              <th>Status</th>
              <th>Last used</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id}>
                <td>{key.name}</td>
                <td><code>{key.keyPrefix}…</code></td>
                <td>{key.environment === "live" ? "Production" : "Development"}</td>
                <td><span className={`dev-api-status dev-api-status--${key.status}`}>{key.status}</span></td>
                <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}</td>
                <td>
                  {key.status === "active" && (
                    <button className="dev-api-revoke" onClick={() => setRevokeTarget(key)} type="button">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={!!newKey}
        title="API key created"
        description="This is the only time the full key is shown — store it now."
        onClose={() => { setNewKey(null); setCopied(false); }}
        actions={<Button variant="default" onClick={() => { setNewKey(null); setCopied(false); }}>Done</Button>}
      >
        {newKey && (
          <div className="dev-api-new-key">
            <code>{newKey.key}</code>
            <Button variant="default" size="sm" icon={copied ? "check" : undefined} onClick={copyKey}>
              {copied ? "Copied" : "Copy key"}
            </Button>
            <p className="dev-api-warning">
              <Icon name="settings" size={14} /> You won't be able to see this key again. If you lose it, revoke it and create a new one.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!revokeTarget}
        title="Revoke this API key?"
        description={revokeTarget ? `Requests using ${revokeTarget.keyPrefix}… will start failing immediately. This can't be undone.` : ""}
        onClose={() => setRevokeTarget(null)}
        actions={(
          <>
            <Button variant="default" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleRevoke}>Revoke key</Button>
          </>
        )}
      >
        <p />
      </Modal>
    </section>
  );
}

function UsagePanel({ project, onToast }) {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getProjectUsage(project.id)
      .then((data) => { if (!cancelled) setUsage(data); })
      .catch((error) => onToast({ message: error.message, tone: "error" }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  if (!usage) return <p className="dev-api-hint">Loading usage…</p>;

  return (
    <section className="dev-api-usage">
      <p className="dev-api-usage__period">{formatPeriod(usage.period)}</p>
      <div className="dev-api-usage__grid">
        {USAGE_METRICS.map((metric) => (
          <UsageMeter
            key={metric.id}
            label={metric.label}
            description={metric.description}
            value={usage[metric.id] || 0}
          />
        ))}
      </div>
    </section>
  );
}

function BillingPanel() {
  return (
    <section className="dev-api-billing">
      <div className="dev-api-billing__badge">Beta — free while in early access</div>
      <h2>You're not being billed yet</h2>
      <p>
        The Webilo Communications API is in free early access while we learn real usage patterns.
        Usage-based billing isn't live — this project's sends are not currently charged.
      </p>
      <p>
        When billing does launch, you'll see a clear notice here first and nothing will change
        automatically without it.
      </p>
    </section>
  );
}

function formatPeriod(period) {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
