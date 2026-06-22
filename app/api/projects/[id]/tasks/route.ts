import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { BAR_COLORS } from "@/app/lib/types";

// POST /api/projects/[id]/tasks — add a new task
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name } = await req.json();
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { tasks: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const maxSort = project.tasks.reduce((m, t) => Math.max(m, t.sortOrder), -1);
    const color = BAR_COLORS[project.tasks.length % BAR_COLORS.length];

    const task = await prisma.task.create({
      data: {
        projectId: params.id,
        name: name?.trim() || "New Task",
        color,
        cells: Array(project.totalWeeks).fill(false),
        sortOrder: maxSort + 1,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
