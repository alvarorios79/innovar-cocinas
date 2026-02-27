export async function archiveProject(projectId: number) {
  const response = await fetch("/api/trpc/projects.archive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error archivando proyecto");
  }

  const result = await response.json();
  return result;
}

export async function unarchiveProject(projectId: number) {
  const response = await fetch("/api/trpc/projects.unarchive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error restaurando proyecto");
  }

  const result = await response.json();
  return result;
}
