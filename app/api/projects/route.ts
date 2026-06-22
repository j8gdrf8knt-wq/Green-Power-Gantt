import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { TEMPLATE_TASKS, DEFAULT_WEEKS } from "@/app/lib/types";

// GET /api/projects — return all projects with tasks, ordered
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { sortOrder: "asc" },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(projects);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

// POST /api/projects — create a new project pre-filled with template tasks
export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const maxSort = await prisma.project.aggregate({ _max: { sortOrder: true } });
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        totalWeeks: DEFAULT_WEEKS,
        sortOrder: nextSort,
        tasks: {
          create: TEMPLATE_TASKS.map((t) => ({
            ...t,
            cells: Array(DEFAULT_WEEKS).fill(false),
          })),
        },
      },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
