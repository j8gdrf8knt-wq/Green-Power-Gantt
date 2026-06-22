import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// PATCH /api/tasks/[taskId] — update name, color, or toggle a cell
export async function PATCH(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const body = await req.json();
    const { name, color, toggleWeek } = body;

    const task = await prisma.task.findUnique({ where: { id: params.taskId } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (typeof toggleWeek === "number") {
      const cells = [...(task.cells as boolean[])];
      cells[toggleWeek] = !cells[toggleWeek];
      updateData.cells = cells;
    }

    const updated = await prisma.task.update({
      where: { id: params.taskId },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// DELETE /api/tasks/[taskId]
export async function DELETE(
  _req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    await prisma.task.delete({ where: { id: params.taskId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
