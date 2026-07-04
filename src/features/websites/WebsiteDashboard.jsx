import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebsites } from "../../context/WebsiteContext";
import { useBusiness } from "../../context/BusinessContext";
import { AppLayout, Button, EmptyState, Icon, Modal, PageHeader } from "./components/WebiloUI";
import { ProPrompt } from "../plans/PlanUI";

function relativeTime(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short" }).format(new Date(value));
}

function ProjectCard({ project, onOpen, onView, onDelete }) {
  const home = project.pages[0];
  return (
    <article className="wl-project-card">
      <button className="wl-project-card__preview" onClick={onOpen} aria-label={`Edit ${project.name}`}>
        <div style={{ "--project-accent": project.theme.primary }}>
          <span className="wl-project-mini-nav" />
          <strong>{home?.sections[0]?.content?.heading || project.name}</strong>
          <small>{home?.sections[0]?.content?.body}</small>
          <i />
        </div>
      </button>
      <div className="wl-project-card__body">
        <div>
          <span className={`wl-status wl-status--${project.status}`}>{project.status === "published" ? "Published" : "Draft"}</span>
          <h2>{project.name}</h2>
          <p><Icon name="clock" size={14} /> Edited {relativeTime(project.updatedAt)}</p>
        </div>
        <div className="wl-project-card__actions">
          {onView && <button onClick={onView} aria-label={`View published ${project.name}`}><Icon name="external" /></button>}
          <button onClick={onOpen} aria-label={`Open ${project.name}`}><Icon name="chevron" /></button>
          <button onClick={onDelete} aria-label={`Delete ${project.name}`}><Icon name="trash" /></button>
        </div>
      </div>
    </article>
  );
}

export default function WebsiteDashboard() {
  const { projects, activity, hydrated, syncStatus, syncError, deleteProject } = useWebsites();
  const { activeBusiness, activeBusinessId, businesses, loadingBusinesses } = useBusiness();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();
  const businessProjects = useMemo(
    () => projects.filter((project) =>
      project.settings?.businessId === activeBusinessId ||
      (!project.settings?.businessId && businesses.length === 1)
    ),
    [activeBusinessId, businesses.length, projects]
  );
  const businessProjectIds = useMemo(() => new Set(businessProjects.map((project) => project.id)), [businessProjects]);
  const businessActivity = useMemo(() => activity.filter((item) => businessProjectIds.has(item.projectId)), [activity, businessProjectIds]);
  const published = useMemo(() => businessProjects.filter((project) => project.status === "published").length, [businessProjects]);

  useEffect(() => {
    if (!loadingBusinesses && !activeBusiness) navigate("/onboarding", { replace: true });
  }, [activeBusiness, loadingBusinesses, navigate]);

  if (loadingBusinesses || !activeBusiness) {
    return <AppLayout><div className="wl-page"><div className="wl-project-skeleton" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="wl-page">
        <PageHeader
          eyebrow="Website module"
          title={`${activeBusiness.name} online`}
          description="Build the website connected to this business profile, offer, and customer journey."
          action={<Button variant="primary" icon="plus" onClick={() => navigate("/create")}>Create business website</Button>}
        />
        <ProPrompt
          compact
          title="Build more with higher AI limits"
          body="Higher AI capacity is available now. Custom domains and branding controls are coming next."
          action="See the Pro roadmap"
        />
        {syncStatus === "offline" && (
          <div className="wl-sync-alert" role="status">
            <Icon name="save" />
            <div><strong>Working from this device</strong><p>{syncError || "Firebase is unavailable. Your local copy is safe and will be retried later."}</p></div>
          </div>
        )}

        {!hydrated ? (
          <div className="wl-project-grid">{[1, 2, 3].map((item) => <div className="wl-project-skeleton" key={item} />)}</div>
        ) : businessProjects.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="Bring this business online"
            body="Webilo will use the business profile, audience, goals, products, and services to prepare a focused digital presence."
            action={<Button variant="primary" icon="sparkles" onClick={() => navigate("/create")}>Build from business profile</Button>}
          />
        ) : (
          <>
            <section className="wl-dashboard-summary" aria-label="Workspace summary">
              <div><span>{businessProjects.length}</span><p>Business websites</p></div>
              <div><span>{businessProjects.length - published}</span><p>In progress</p></div>
              <div><span>{published}</span><p>Published</p></div>
            </section>
            <section>
              <div className="wl-section-title"><div><h2>Digital presence</h2><p>Everything here belongs to {activeBusiness.name}.</p></div></div>
              <div className="wl-project-grid">
                {businessProjects.map((project) => (
                  <ProjectCard
                    project={project}
                    onOpen={() => navigate(`/editor/${project.id}`)}
                    onView={project.publishedSlug ? () => window.open(`/w/${project.publishedSlug}`, "_blank", "noopener,noreferrer") : null}
                    onDelete={() => setDeleteTarget(project)}
                    key={project.id}
                  />
                ))}
                <button className="wl-project-new" onClick={() => navigate("/create")}>
                  <span><Icon name="plus" /></span><strong>New business website</strong><small>Use the existing business foundation</small>
                </button>
              </div>
            </section>
            <section className="wl-activity">
              <div className="wl-section-title"><div><h2>Recent activity</h2><p>Your latest changes across this workspace.</p></div></div>
              <div className="wl-activity-list">
                {businessActivity.slice(0, 5).map((item) => (
                  <button onClick={() => navigate(`/editor/${item.projectId}`)} key={item.id}>
                    <span><Icon name={item.type === "published" ? "rocket" : item.type === "created" ? "sparkles" : "save"} /></span>
                    <div><strong>{item.message}</strong><small>{relativeTime(item.at)}</small></div>
                    <Icon name="chevron" />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
      <Modal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        description="This removes the website and its saved content from this workspace. This cannot be undone."
        onClose={() => setDeleteTarget(null)}
        actions={<><Button onClick={() => setDeleteTarget(null)}>Keep website</Button><Button variant="danger" icon="trash" onClick={() => { deleteProject(deleteTarget.id); setDeleteTarget(null); }}>Delete website</Button></>}
      />
    </AppLayout>
  );
}
