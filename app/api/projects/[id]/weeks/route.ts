import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// PATCH /api/projects/[id]/weeks — change total weeks, resize all task cell arrays
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { totalWeeks } = await req.json();
    if (typeof totalWeeks !== "number" || totalWeeks < 4 || totalWeeks > 104) {
      return NextResponse.json({ error: "Invalid week count" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { tasks: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Resize each task's cells array
    await prisma.$transaction([
      prisma.project.update({
        where: { id: params.id },
        data: { totalWeeks },
      }),
      ...project.tasks.map((task) => {
        const current = task.cells as boolean[];
        let newCells: boolean[];
        if (totalWeeks > current.length) {
          newCells = [...current, ...Array(totalWeeks - current.length).fill(false)];
        } else {
          newCells = current.slice(0, totalWeeks);
        }
        return prisma.task.update({ where: { id: task.id }, data: { cells: newCells } });
      }),
    ]);

    const updated = await prisma.project.findUnique({
      where: { id: params.id },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update weeks" }, { status: 500 });
  }
}
