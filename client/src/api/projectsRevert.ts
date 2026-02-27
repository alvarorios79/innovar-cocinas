export async function revertProjectStatus(projectId: number) {
  const response = await fetch("/api/trpc/projects.revertStatus", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: projectId }),
  });

  if (!response.ok) {
    throw new Error("Error revirtiendo estado");
  }

  return response.json();
}
