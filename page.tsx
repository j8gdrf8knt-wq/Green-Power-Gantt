import { prisma } from "./lib/prisma";
import GanttEditor from "./components/GanttEditor";
import type { GanttProject } from "./lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  let projects: GanttProject[] = [];
  try {
    const raw = await prisma.project.findMany({
      orderBy: { sortOrder: "asc" },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });
    projects = raw as unknown as GanttProject[];
  } catch (err) {
    console.error("DB load error:", err);
  }

  return <GanttEditor initialProjects={projects} />;
}
