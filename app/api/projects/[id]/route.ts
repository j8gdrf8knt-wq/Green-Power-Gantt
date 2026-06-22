import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// PATCH /api/projects/[id] — rename project
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name } = await req.json();
    const project = await prisma.project.update({
      where: { id: params.id },
      data: { name },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(project);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — delete project and all its tasks (cascade)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
