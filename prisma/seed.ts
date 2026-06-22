import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function wks(start: number, dur: number, total: number): boolean[] {
  return Array.from({ length: total }, (_, i) => i >= start && i < start + dur);
}

async function main() {
  // Only seed if no projects exist
  const count = await prisma.project.count();
  if (count > 0) return;

  await prisma.project.create({
    data: {
      name: "286 kWp [DC] / 250 kW [AC] Grid-Tied Solar System",
      totalWeeks: 16,
      sortOrder: 0,
      tasks: {
        create: [
          { name: "Foreign Goods LC",              color: "#C0392B", cells: wks(0, 8, 16),  sortOrder: 0 },
          { name: "Local Goods Procurement",       color: "#2980B9", cells: wks(5, 3, 16),  sortOrder: 1 },
          { name: "Module Structure Installation", color: "#E67E22", cells: wks(8, 3, 16),  sortOrder: 2 },
          { name: "PV Module Installation",        color: "#8E44AD", cells: wks(9, 2, 16),  sortOrder: 3 },
          { name: "Inverter Installation",         color: "#16A085", cells: wks(11, 2, 16), sortOrder: 4 },
          { name: "AC, DC Cable Routing",          color: "#7D6608", cells: wks(10, 3, 16), sortOrder: 5 },
          { name: "Others Installation",           color: "#6C3483", cells: wks(13, 1, 16), sortOrder: 6 },
          { name: "Testing & Commissioning",       color: "#E74C3C", cells: wks(14, 1, 16), sortOrder: 7 },
          { name: "Commercial Operation (COD)",    color: "#27AE60", cells: wks(15, 1, 16), sortOrder: 8 },
        ],
      },
    },
  });

  console.log("✅ Seeded default project");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
