import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET /api/setup — creates tables if they don't exist, then seeds default project
// Call this once after deployment: visit /api/setup in your browser
export async function GET() {
  try {
    // Use raw SQL to create tables (works even before prisma migrate)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Project" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        "totalWeeks" INTEGER NOT NULL DEFAULT 16,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Task" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#1a5c1a',
        cells BOOLEAN[] NOT NULL DEFAULT '{}',
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed default project if none exist
    const count = await prisma.project.count();
    if (count === 0) {
      const wks = (start: number, dur: number, total: number) =>
        Array.from({ length: total }, (_, i) => i >= start && i < start + dur);

      await prisma.project.create({
        data: {
          name: "286 kWp [DC] / 250 kW [AC] Grid-Tied Solar System",
          totalWeeks: 16,
          sortOrder: 0,
          tasks: {
            create: [
              { name: "Foreign Goods LC",              color: "#C0392B", cells: wks(0,8,16),  sortOrder: 0 },
              { name: "Local Goods Procurement",       color: "#2980B9", cells: wks(5,3,16),  sortOrder: 1 },
              { name: "Module Structure Installation", color: "#E67E22", cells: wks(8,3,16),  sortOrder: 2 },
              { name: "PV Module Installation",        color: "#8E44AD", cells: wks(9,2,16),  sortOrder: 3 },
              { name: "Inverter Installation",         color: "#16A085", cells: wks(11,2,16), sortOrder: 4 },
              { name: "AC, DC Cable Routing",          color: "#7D6608", cells: wks(10,3,16), sortOrder: 5 },
              { name: "Others Installation",           color: "#6C3483", cells: wks(13,1,16), sortOrder: 6 },
              { name: "Testing & Commissioning",       color: "#E74C3C", cells: wks(14,1,16), sortOrder: 7 },
              { name: "Commercial Operation (COD)",    color: "#27AE60", cells: wks(15,1,16), sortOrder: 8 },
            ],
          },
        },
      });
      return NextResponse.json({ ok: true, message: "Tables created and default project seeded." });
    }

    return NextResponse.json({ ok: true, message: "Tables already exist. No changes made." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
