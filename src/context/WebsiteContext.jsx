import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { useAuth } from "./AuthContext";
import { createWebsiteFromBrief } from "../features/websites/websiteModel";
import { reconcileRecords } from "../features/websites/websitePersistence";
import {
  listWebsiteActivity,
  listWebsites,
  publishWebsite,
  removeWebsite,
  removeWebsiteActivity,
  saveWebsite,
  saveWebsiteActivity,
  unpublishWebsite,
} from "../services/websiteRepository";

const WebsiteContext = createContext(null);
const STORAGE_VERSION = "webilo.websites.v1";

const initialState = {
  projects: [],
  activity: [],
  deletedProjectIds: [],
  deletedProjectSlugs: {},
  hydrated: false,
  syncStatus: "loading",
  syncError: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return { ...initialState, ...action.payload, hydrated: true };
    case "SYNC_STATUS":
      return {
        ...state,
        syncStatus: action.status,
        syncError: action.error || null,
      };
    case "CREATE_PROJECT":
      return {
        ...state,
        projects: [action.project, ...state.projects],
        activity: [action.activity, ...state.activity].slice(0, 20),
      };
    case "SAVE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.project.id
            ? { ...action.project, updatedAt: action.at }
            : project
        ),
        activity: action.recordActivity
          ? [action.activity, ...state.activity].slice(0, 20)
          : state.activity,
      };
    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.projectId),
        activity: state.activity.filter((item) => item.projectId !== action.projectId),
        deletedProjectIds: [...new Set([...state.deletedProjectIds, action.projectId])],
        deletedProjectSlugs: action.publishedSlug
          ? { ...state.deletedProjectSlugs, [action.projectId]: action.publishedSlug }
          : state.deletedProjectSlugs,
      };
    case "CLEAR_DELETED_PROJECT": {
      const deletedProjectSlugs = { ...state.deletedProjectSlugs };
      delete deletedProjectSlugs[action.projectId];
      return {
        ...state,
        deletedProjectIds: state.deletedProjectIds.filter(
          (projectId) => projectId !== action.projectId
        ),
        deletedProjectSlugs,
      };
    }
    default:
      return state;
  }
}

export function WebsiteProvider({ children }) {
  const { user, loadingUser } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const storageKey = `${STORAGE_VERSION}:${user?.uid || "guest"}`;

  useEffect(() => {
    if (loadingUser) return undefined;
    let cancelled = false;
    let cached = { projects: [], activity: [], deletedProjectIds: [], deletedProjectSlugs: {} };

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) cached = JSON.parse(stored);
    } catch {
      cached = { projects: [], activity: [], deletedProjectIds: [], deletedProjectSlugs: {} };
    }

    if (!user) {
      dispatch({
        type: "HYDRATE",
        payload: { ...cached, syncStatus: "offline", syncError: null },
      });
      return undefined;
    }

    dispatch({
      type: "HYDRATE",
      payload: { ...cached, syncStatus: "loading", syncError: null },
    });

    async function hydrateFromFirestore() {
      try {
        const [remoteProjects, remoteActivity] = await Promise.all([
          listWebsites(user.uid),
          listWebsiteActivity(user.uid),
        ]);
        if (cancelled) return;

        const deletedProjectIds = cached.deletedProjectIds || [];
        const deletedProjectSlugs = cached.deletedProjectSlugs || {};
        const projects = reconcileRecords(
          remoteProjects,
          cached.projects || [],
          "updatedAt",
          deletedProjectIds
        );
        const activity = reconcileRecords(
          remoteActivity,
          cached.activity || [],
          "at",
          deletedProjectIds
        ).slice(0, 20);

        dispatch({
          type: "HYDRATE",
          payload: {
            projects,
            activity,
            deletedProjectIds,
            deletedProjectSlugs,
            syncStatus: "synced",
            syncError: null,
          },
        });

        const remoteProjectMap = new Map(
          remoteProjects.map((project) => [project.id, project])
        );
        const remoteActivityIds = new Set(remoteActivity.map((item) => item.id));
        const projectsToMigrate = projects.filter((project) => {
          const remote = remoteProjectMap.get(project.id);
          return !remote || new Date(project.updatedAt) > new Date(remote.updatedAt);
        });
        const activityToMigrate = activity.filter(
          (item) => !remoteActivityIds.has(item.id)
        );

        await Promise.all([
          ...projectsToMigrate.map((project) =>
            saveWebsite(user.uid, project)
          ),
          ...activityToMigrate.map((item) =>
            saveWebsiteActivity(user.uid, item)
          ),
          ...deletedProjectIds.map(async (projectId) => {
            const operations = [removeWebsiteActivity(user.uid, projectId)];
            if (remoteProjectMap.has(projectId)) {
              operations.push(removeWebsite(projectId));
            }
            const publishedSlug =
              deletedProjectSlugs[projectId] ||
              remoteProjectMap.get(projectId)?.publishedSlug;
            if (publishedSlug) {
              operations.push(unpublishWebsite(publishedSlug));
            }
            await Promise.all(operations);
            dispatch({ type: "CLEAR_DELETED_PROJECT", projectId });
          }),
        ]);
      } catch (error) {
        if (cancelled) return;
        dispatch({
          type: "SYNC_STATUS",
          status: "offline",
          error: "Firestore is unavailable. Changes remain saved on this device.",
        });
      }
    }

    hydrateFromFirestore();
    return () => {
      cancelled = true;
    };
  }, [loadingUser, storageKey, user]);

  useEffect(() => {
    if (!state.hydrated) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        projects: state.projects,
        activity: state.activity,
        deletedProjectIds: state.deletedProjectIds,
        deletedProjectSlugs: state.deletedProjectSlugs,
      })
    );
  }, [
    state.projects,
    state.activity,
    state.deletedProjectIds,
    state.deletedProjectSlugs,
    state.hydrated,
    storageKey,
  ]);

  const createProject = useCallback(
    (brief, blueprint = null) => {
      const project = createWebsiteFromBrief(
        { ...brief, ownerId: user?.uid || null },
        blueprint
      );
      const activity = {
        id: `activity_${Date.now()}`,
        projectId: project.id,
        type: "created",
        message: `Created ${project.name}`,
        at: project.createdAt,
      };
      dispatch({ type: "CREATE_PROJECT", project, activity });
      if (user) {
        Promise.all([
          saveWebsite(user.uid, project),
          saveWebsiteActivity(user.uid, activity),
        ])
          .then(() => dispatch({ type: "SYNC_STATUS", status: "synced" }))
          .catch(() =>
            dispatch({
              type: "SYNC_STATUS",
              status: "offline",
              error: "The project is saved locally and will sync when Firebase is available.",
            })
          );
      }
      return project;
    },
    [user]
  );

  const saveProject = useCallback(
    (project, options = {}) => {
      const at = new Date().toISOString();
      const savedProject = { ...project, ownerId: user?.uid || project.ownerId, updatedAt: at };
      const shouldRecordActivity = options.recordActivity !== false;
      const activity = {
        id: `activity_${Date.now()}`,
        projectId: savedProject.id,
        type: options.activityType || "saved",
        message: options.message || `Updated ${savedProject.name}`,
        at,
      };
      dispatch({
        type: "SAVE_PROJECT",
        project: savedProject,
        at,
        recordActivity: shouldRecordActivity,
        activity,
      });
      if (user) {
        const operations = [saveWebsite(user.uid, savedProject)];
        if (shouldRecordActivity) {
          operations.push(saveWebsiteActivity(user.uid, activity));
        }
        Promise.all(operations)
          .then(() => dispatch({ type: "SYNC_STATUS", status: "synced" }))
          .catch(() =>
            dispatch({
              type: "SYNC_STATUS",
              status: "offline",
              error: "Changes are saved locally and will sync when Firebase is available.",
            })
          );
      }
      return savedProject;
    },
    [user]
  );

  const publishProject = useCallback(
    async (project) => {
      const at = new Date().toISOString();
      const publishedSlug =
        project.publishedSlug || `${project.slug}-${project.id.slice(-6)}`;
      const savedProject = {
        ...project,
        ownerId: user?.uid || project.ownerId,
        status: "published",
        publishedSlug,
        publishedAt: at,
        updatedAt: at,
      };
      const activity = {
        id: `activity_${Date.now()}`,
        projectId: savedProject.id,
        type: "published",
        message: `Published ${savedProject.name}`,
        at,
      };
      dispatch({
        type: "SAVE_PROJECT",
        project: savedProject,
        at,
        recordActivity: true,
        activity,
      });

      if (!user) return savedProject;

      dispatch({ type: "SYNC_STATUS", status: "loading" });
      try {
        await Promise.all([
          saveWebsite(user.uid, savedProject),
          publishWebsite(user.uid, savedProject),
          saveWebsiteActivity(user.uid, activity),
        ]);
        dispatch({ type: "SYNC_STATUS", status: "synced" });
        return savedProject;
      } catch (error) {
        dispatch({
          type: "SYNC_STATUS",
          status: "offline",
          error: "The draft is safe, but the public website could not be updated.",
        });
        throw error;
      }
    },
    [user]
  );

  const deleteProject = useCallback(
    (projectId) => {
      const project = state.projects.find((item) => item.id === projectId);
      dispatch({
        type: "DELETE_PROJECT",
        projectId,
        publishedSlug: project?.publishedSlug,
      });
      if (user) {
        const operations = [
          removeWebsite(projectId),
          removeWebsiteActivity(user.uid, projectId),
        ];
        if (project?.publishedSlug) {
          operations.push(unpublishWebsite(project.publishedSlug));
        }
        Promise.all(operations)
          .then(() => {
            dispatch({ type: "CLEAR_DELETED_PROJECT", projectId });
            dispatch({ type: "SYNC_STATUS", status: "synced" });
          })
          .catch(() =>
            dispatch({
              type: "SYNC_STATUS",
              status: "offline",
              error: "The website was removed locally, but Firebase could not be reached.",
            })
          );
      }
    },
    [state.projects, user]
  );

  const value = useMemo(
    () => ({
      ...state,
      createProject,
      saveProject,
      publishProject,
      deleteProject,
      getProject: (projectId) => state.projects.find((project) => project.id === projectId),
    }),
    [state, createProject, saveProject, publishProject, deleteProject]
  );

  return <WebsiteContext.Provider value={value}>{children}</WebsiteContext.Provider>;
}

export function useWebsites() {
  const context = useContext(WebsiteContext);
  if (!context) throw new Error("useWebsites must be used inside WebsiteProvider");
  return context;
}
