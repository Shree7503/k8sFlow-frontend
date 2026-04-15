/**
 * k8sFlow API Service
 *
 * Centralized API calls matching the backend API spec at:
 *   Base URL: http://localhost:8080/api/v1
 *
 * All methods return the Axios response — callers handle response.data.
 */

import axiosInstance from '../axios/interceptor';

const API = '/api/v1';

// ─── Auth ────────────────────────────────────────────────────────

export const authApi = {
  /** POST /login — JSON body */
  login: (email: string, password: string) =>
    axiosInstance.post(`${API}/login`, { email, password }),

  /** POST /register — multipart/form-data */
  register: (name: string, email: string, password: string) => {
    const body = new FormData();
    body.append('name', name);
    body.append('email', email);
    body.append('password', password);
    return axiosInstance.post(`${API}/register`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Users (Admin Only) ──────────────────────────────────────────

export const usersApi = {
  /** GET /users/:id */
  getUser: (id: string) =>
    axiosInstance.get(`${API}/users/${id}`),

  /** PUT /users/:id — JSON body { name, email, password?, role? } */
  updateUser: (id: string, data: { name?: string; email?: string; password?: string; role?: number }) =>
    axiosInstance.put(`${API}/users/${id}`, data),

  /** DELETE /users/:id */
  deleteUser: (id: string) =>
    axiosInstance.delete(`${API}/users/${id}`),
};

// ─── Clusters ────────────────────────────────────────────────────

export const clustersApi = {
  /** GET /clusters */
  list: () =>
    axiosInstance.get(`${API}/clusters`),

  /** GET /clusters/:id */
  get: (id: string) =>
    axiosInstance.get(`${API}/clusters/${id}`),

  /** POST /clusters — Admin only */
  create: (data: { name: string; provider: string; description?: string }) =>
    axiosInstance.post(`${API}/clusters`, data),

  /** PUT /clusters/:id — Admin only */
  update: (id: string, data: { name?: string; provider?: string; description?: string }) =>
    axiosInstance.put(`${API}/clusters/${id}`, data),

  /** DELETE /clusters/:id — Admin only */
  delete: (id: string) =>
    axiosInstance.delete(`${API}/clusters/${id}`),
};

// ─── Cluster Credentials (Admin access to cluster required) ─────

export const clusterCredsApi = {
  /** GET /clusters/:id/creds */
  get: (clusterId: string) =>
    axiosInstance.get(`${API}/clusters/${clusterId}/creds`),

  /** POST /clusters/:id/creds — multipart/form-data */
  upload: (clusterId: string, kubeconfigFile: File) => {
    const body = new FormData();
    body.append('kubeconfig', kubeconfigFile);
    return axiosInstance.post(`${API}/clusters/${clusterId}/creds`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** PUT /clusters/:id/creds — multipart/form-data */
  update: (clusterId: string, kubeconfigFile: File) => {
    const body = new FormData();
    body.append('kubeconfig', kubeconfigFile);
    return axiosInstance.put(`${API}/clusters/${clusterId}/creds`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** DELETE /clusters/:id/creds */
  delete: (clusterId: string) =>
    axiosInstance.delete(`${API}/clusters/${clusterId}/creds`),
};

// ─── Cluster Access (Admin Only) ────────────────────────────────

export const clusterAccessApi = {
  /** GET /clusters/access */
  list: () =>
    axiosInstance.get(`${API}/clusters/access`),

  /** POST /clusters/access */
  grant: (userId: string, clusterId: string, role: number) =>
    axiosInstance.post(`${API}/clusters/access`, {
      user_id: userId,
      cluster_id: clusterId,
      role,
    }),

  /** PUT /clusters/access */
  update: (userId: string, clusterId: string, role: number) =>
    axiosInstance.put(`${API}/clusters/access`, {
      user_id: userId,
      cluster_id: clusterId,
      role,
    }),

  /** DELETE /clusters/access?user_id=X&cluster_id=Y */
  revoke: (userId: string, clusterId: string) =>
    axiosInstance.delete(
      `${API}/clusters/access?user_id=${encodeURIComponent(userId)}&cluster_id=${encodeURIComponent(clusterId)}`
    ),
};

// ─── Cluster Connection (Viewer access required) ────────────────

export const connectionApi = {
  /** POST /connect/:id */
  connect: (clusterId: string) =>
    axiosInstance.post(`${API}/connect/${clusterId}`),

  /** DELETE /connect/:id */
  disconnect: (clusterId: string) =>
    axiosInstance.delete(`${API}/connect/${clusterId}`),
};

// ─── Workflows (Editor access required) ─────────────────────────

export interface DeploymentNode {
  id: string;
  name: string;
  namespace: string;
  image: string;
  replicas: number;
  port: number;
}

export interface ServiceNode {
  id: string;
  name: string;
  namespace: string;
  protocol: string;
  port: number;
  target_port: number;
}

export interface IngressNode {
  id: string;
  name: string;
  namespace: string;
  host: string;
  path: string;
  path_type: string;
  target_port: number;
  service_name: string;
  service_port: number;
}

export interface ConfigMapNode {
  id: string;
  name: string;
  namespace: string;
  data: Record<string, string>;
}

export interface WorkflowEdge {
  source_id: string;
  target_id: string;
}

export interface Workflow {
  deployments: DeploymentNode[];
  services: ServiceNode[];
  ingresses?: IngressNode[];
  configmaps?: ConfigMapNode[];
  edges: WorkflowEdge[];
}

export const workflowsApi = {
  /** GET /workflows?cluster_id=X */
  list: (clusterId: string) =>
    axiosInstance.get(`${API}/workflows`, { params: { cluster_id: clusterId } }),

  /** POST /workflows/apply */
  apply: (data: {
    name: string;
    cluster_id: string;
    workflow: Workflow;
  }) => axiosInstance.post(`${API}/workflows/apply`, data),

  /** POST /workflows/destroy */
  destroy: (clusterId: string, workflowId: string) =>
    axiosInstance.post(`${API}/workflows/destroy`, {
      cluster_id: clusterId,
      workflow_id: workflowId,
    }),

  /** PUT /workflows/update */
  update: (data: {
    cluster_id: string;
    workflow_id: string;
    workflow: Record<string, unknown>;
  }) => axiosInstance.put(`${API}/workflows/update`, data),

  /** DELETE /workflows/:id?cluster_id=X */
  delete: (workflowId: string, clusterId: string) =>
    axiosInstance.delete(`${API}/workflows/${workflowId}`, {
      params: { cluster_id: clusterId },
    }),
};

// ─── Namespaces (Viewer access required) ─────────────────────────

export const namespacesApi = {
  /** GET /namespaces?cluster_id=X */
  list: (clusterId: string) =>
    axiosInstance.get(`${API}/namespaces`, { params: { cluster_id: clusterId } }),
};

// ─── Deployments ─────────────────────────────────────────────────

export const deploymentsApi = {
  /** GET /deployments?cluster_id=X&namespace=Y */
  list: (clusterId: string, namespace: string) =>
    axiosInstance.get(`${API}/deployments`, {
      params: { cluster_id: clusterId, namespace },
    }),

  /** GET /deployments/:name?cluster_id=X&namespace=Y */
  get: (name: string, clusterId: string, namespace: string) =>
    axiosInstance.get(`${API}/deployments/${name}`, {
      params: { cluster_id: clusterId, namespace },
    }),

  /** PATCH /deployments/:name/scale?cluster_id=X&namespace=Y */
  scale: (name: string, clusterId: string, namespace: string, replicas: number) =>
    axiosInstance.patch(`${API}/deployments/${name}/scale`, { replicas }, {
      params: { cluster_id: clusterId, namespace },
    }),
};

// ─── AI Chat ────────────────────────────────────────────────────
export const aiApi = {
  /** POST /ai/chat */
  chat: (prompt: string) =>
    axiosInstance.post(`${API}/ai/chat`, { prompt }),
};
