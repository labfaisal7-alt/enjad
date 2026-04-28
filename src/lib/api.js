export const TOKEN_STORAGE_KEY = "enjad_session_token";

async function request(path, { method = "GET", token, data } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error("تعذر الوصول إلى خادم النظام. شغّل خادم الـ API ثم أعد المحاولة.");
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "تعذر إكمال الطلب.");
  }

  return payload;
}

export const api = {
  login(identifier, password) {
    return request("/api/auth/login", {
      method: "POST",
      data: { identifier, password },
    });
  },
  getSession(token) {
    return request("/api/auth/session", { token });
  },
  logout(token) {
    return request("/api/auth/logout", {
      method: "POST",
      token,
    });
  },
  createIncident(token, incident) {
    return request("/api/incidents", {
      method: "POST",
      token,
      data: incident,
    });
  },
  closeIncident(token, id) {
    return request(`/api/incidents/${encodeURIComponent(id)}/close`, {
      method: "PATCH",
      token,
    });
  },
  deleteIncident(token, id) {
    return request(`/api/incidents/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token,
    });
  },
  addUser(token, user) {
    return request("/api/users", {
      method: "POST",
      token,
      data: user,
    });
  },
  updateUser(token, userId, user) {
    return request(`/api/users/${userId}`, {
      method: "PATCH",
      token,
      data: user,
    });
  },
  resetUserPassword(token, userId) {
    return request(`/api/users/${userId}/reset-password`, {
      method: "POST",
      token,
    });
  },
  deleteUser(token, userId) {
    return request(`/api/users/${userId}`, {
      method: "DELETE",
      token,
    });
  },
  changePassword(token, form) {
    return request("/api/users/change-password", {
      method: "POST",
      token,
      data: form,
    });
  },
  addDepartment(token, name) {
    return request("/api/departments", {
      method: "POST",
      token,
      data: { name },
    });
  },
  deleteDepartment(token, name) {
    return request(`/api/departments/${encodeURIComponent(name)}`, {
      method: "DELETE",
      token,
    });
  },
  addCity(token, name) {
    return request("/api/cities", {
      method: "POST",
      token,
      data: { name },
    });
  },
  deleteCity(token, name) {
    return request(`/api/cities/${encodeURIComponent(name)}`, {
      method: "DELETE",
      token,
    });
  },
  addSite(token, city, name) {
    return request("/api/sites", {
      method: "POST",
      token,
      data: { city, name },
    });
  },
  deleteSite(token, index) {
    return request(`/api/sites/${index}`, {
      method: "DELETE",
      token,
    });
  },
  resetData(token) {
    return request("/api/reset-data", {
      method: "POST",
      token,
    });
  },
};
