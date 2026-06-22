"use client";

import { useState, useRef, useCallback } from "react";
import type { GanttProject, GanttTask } from "../lib/types";

interface Props {
  initialProjects: GanttProject[];
}

type SaveStatus = "saved" | "saving" | "error";

export default function GanttEditor({ initialProjects }: Props) {
  const [projects, setProjects] = useState<GanttProject[]>(initialProjects);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [newTaskName, setNewTaskName] = useState("");
  const [exporting, setExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  const proj = projects[currentIndex] as GanttProject | undefined;

  // ── optimistic update helper ────────────────────────────────────────────
  const mutate = useCallback((updater: (draft: GanttProject[]) => void) => {
    setProjects((prev) => {
      const next = structuredClone(prev);
      updater(next);
      return next;
    });
  }, []);

  const saving = useCallback(async (fn: () => Promise<void>) => {
    setSaveStatus("saving");
    try {
      await fn();
      setSaveStatus("saved");
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  }, []);

  // ── Project management ──────────────────────────────────────────────────
  const handleNewProject = async () => {
    const name = prompt("New project name:", "New Project");
    if (!name) return;
    await saving(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newProj: GanttProject = await res.json();
      setProjects((prev) => [...prev, newProj]);
      setCurrentIndex(projects.length);
    });
  };

  const handleDeleteProject = async () => {
    if (!proj) return;
    if (projects.length <= 1) { alert("At least one project must remain."); return; }
    if (!confirm(`Delete "${proj.name}"? This cannot be undone.`)) return;
    await saving(async () => {
      const res = await fetch(`/api/projects/${proj.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setProjects((prev) => prev.filter((p) => p.id !== proj.id));
      setCurrentIndex((i) => Math.max(0, i - 1));
    });
  };

  const handleTitleChange = async (name: string) => {
    if (!proj) return;
    mutate((d) => { d[currentIndex].name = name; });
    await saving(async () => {
      const res = await fetch(`/api/projects/${proj.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
    });
  };

  // ── Week management ─────────────────────────────────────────────────────
  const handleWeekChange = async (delta: number) => {
    if (!proj) return;
    const newWeeks = proj.totalWeeks + delta;
    if (newWeeks < 4) return;
    mutate((d) => {
      const p = d[currentIndex];
      p.totalWeeks = newWeeks;
      p.tasks.forEach((t) => {
        if (delta > 0) t.cells.push(false);
        else t.cells.pop();
      });
    });
    await saving(async () => {
      const res = await fetch(`/api/projects/${proj.id}/weeks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalWeeks: newWeeks }),
      });
      if (!res.ok) throw new Error(await res.text());
    });
  };

  // ── Task management ─────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!proj) return;
    const name = newTaskName.trim() || "New Task";
    await saving(async () => {
      const res = await fetch(`/api/projects/${proj.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const task: GanttTask = await res.json();
      mutate((d) => { d[currentIndex].tasks.push(task); });
      setNewTaskName("");
    });
  };

  const handleTaskName = async (taskId: string, ti: number, name: string) => {
    mutate((d) => { d[currentIndex].tasks[ti].name = name; });
    await saving(async () => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
    });
  };

  const handleTaskColor = async (taskId: string, ti: number, color: string) => {
    mutate((d) => { d[currentIndex].tasks[ti].color = color; });
    await saving(async () => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      if (!res.ok) throw new Error(await res.text());
    });
  };

  const handleToggleCell = async (taskId: string, ti: number, ci: number) => {
    mutate((d) => { d[currentIndex].tasks[ti].cells[ci] = !d[currentIndex].tasks[ti].cells[ci]; });
    await saving(async () => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleWeek: ci }),
      });
      if (!res.ok) throw new Error(await res.text());
    });
  };

  const handleDeleteTask = async (taskId: string, ti: number) => {
    mutate((d) => { d[currentIndex].tasks.splice(ti, 1); });
    await saving(async () => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    });
  };

  // ── Excel export ─────────────────────────────────────────────────────────
  const handleExcelExport = async () => {
    if (!proj) return;
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const totalWeeks = proj.totalWeeks;
      const tasks = proj.tasks;
      const title = proj.name;

      const hexToArgb = (hex: string) => "FF" + hex.replace("#", "").toUpperCase();
      const thinBorder = (color = "C0C0C0") => {
        const s = { style: "thin" as const, color: { argb: "FF" + color } };
        return { top: s, bottom: s, left: s, right: s };
      };
      const thickEdge = (color = "1A5C1A") => ({ style: "medium" as const, color: { argb: "FF" + color } });
      const applyHeaderStyle = (cell: ExcelJS.Cell, bgHex: string, fontSize = 10, bold = true) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(bgHex) } };
        cell.font = { name: "Arial", size: fontSize, bold, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = thinBorder("3a7a3a");
      };

      const wb = new ExcelJS.Workbook();
      wb.creator = "Green Power Ltd.";
      const ws = wb.addWorksheet("Gantt Chart", { views: [{ state: "frozen", xSplit: 1, ySplit: 4, showGridLines: true }] });

      const TASK_COL = 1, WEEK_START = 2, DUR_COL = WEEK_START + totalWeeks;
      ws.getColumn(TASK_COL).width = 32;
      for (let w = 0; w < totalWeeks; w++) ws.getColumn(WEEK_START + w).width = 5;
      ws.getColumn(DUR_COL).width = 11;

      ws.getRow(1).height = 28;
      const titleCell = ws.getCell(1, TASK_COL);
      titleCell.value = title;
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5C1A" } };
      titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(1, TASK_COL, 1, DUR_COL);

      ws.getRow(2).height = 18;
      const subCell = ws.getCell(2, TASK_COL);
      subCell.value = `Project Implementation Schedule  |  Total Duration: ${totalWeeks} Weeks`;
      subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D2E" } };
      subCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FFFFFFFF" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(2, TASK_COL, 2, DUR_COL);

      ws.getRow(3).height = 17;
      const thTask = ws.getCell(3, TASK_COL);
      applyHeaderStyle(thTask, "1A5C1A", 10);
      thTask.value = "Task";
      ws.mergeCells(3, TASK_COL, 4, TASK_COL);

      const grpEnd = Math.min(WEEK_START + 7, DUR_COL - 1);
      const grpCell = ws.getCell(3, WEEK_START);
      applyHeaderStyle(grpCell, "2E7D2E", 10);
      grpCell.value = `W1 – W${grpEnd - WEEK_START + 1}`;
      ws.mergeCells(3, WEEK_START, 3, grpEnd);

      for (let w = 9; w <= totalWeeks; w++) {
        const c = ws.getCell(3, WEEK_START + w - 1);
        applyHeaderStyle(c, "1A5C1A", 9);
        c.value = `W${String(w).padStart(2, "0")}`;
      }

      const thDur = ws.getCell(3, DUR_COL);
      applyHeaderStyle(thDur, "1A5C1A", 9, true);
      thDur.value = "Plan\nDuration";
      ws.mergeCells(3, DUR_COL, 4, DUR_COL);

      ws.getRow(4).height = 15;
      for (let w = 1; w <= totalWeeks; w++) {
        const c = ws.getCell(4, WEEK_START + w - 1);
        applyHeaderStyle(c, w <= 8 ? "2E7D2E" : "1A5C1A", 8);
        c.value = `W${String(w).padStart(2, "0")}`;
      }

      tasks.forEach((task, ti) => {
        const row = 5 + ti;
        ws.getRow(row).height = 22;
        const rowBg = ti % 2 === 1 ? "F8FDF8" : "FFFFFF";

        const nameCell = ws.getCell(row, TASK_COL);
        nameCell.value = task.name;
        nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + rowBg } };
        nameCell.font = { name: "Arial", size: 9, color: { argb: "FF333333" } };
        nameCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
        nameCell.border = thinBorder("C8DCC8");

        let dur = 0;
        for (let w = 0; w < totalWeeks; w++) {
          const cell = ws.getCell(row, WEEK_START + w);
          if (task.cells[w]) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(task.color) } };
            dur++;
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + rowBg } };
          }
          cell.border = thinBorder("C8DCC8");
        }

        const durCell = ws.getCell(row, DUR_COL);
        durCell.value = `${dur}${dur === 1 ? " Week" : " Weeks"}`;
        durCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E8" } };
        durCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF1A5C1A" } };
        durCell.alignment = { horizontal: "center", vertical: "middle" };
        durCell.border = thinBorder("C8DCC8");
      });

      const lastRow = 4 + tasks.length;
      const edge = thickEdge("1A5C1A");
      for (let col = TASK_COL; col <= DUR_COL; col++) {
        ws.getCell(1, col).border = { ...ws.getCell(1, col).border, top: edge };
        ws.getCell(lastRow, col).border = { ...ws.getCell(lastRow, col).border, bottom: edge };
      }
      for (let row = 1; row <= lastRow; row++) {
        ws.getCell(row, TASK_COL).border = { ...ws.getCell(row, TASK_COL).border, left: edge };
        ws.getCell(row, DUR_COL).border = { ...ws.getCell(row, DUR_COL).border, right: edge };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = title.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") + "_Gantt.xlsx";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  // ── PDF export ───────────────────────────────────────────────────────────
  const handlePdfExport = async () => {
    if (!proj) return;
    setPdfExporting(true);
    try {
      const { jsPDF } = (await import("jspdf")).default
        ? (await import("jspdf"))
        : await import("jspdf");

      const tasks = proj.tasks;
      const totalWeeks = proj.totalWeeks;
      const title = proj.name;

      const C = {
        greenDark: [26, 92, 26] as [number,number,number],
        greenMid:  [46,125, 46] as [number,number,number],
        white:     [255,255,255] as [number,number,number],
        oddBg:     [248,253,248] as [number,number,number],
        evenBg:    [255,255,255] as [number,number,number],
        durBg:     [234,245,234] as [number,number,number],
        borderClr: [196,220,196] as [number,number,number],
        textDark:  [34, 34, 34] as [number,number,number],
        textGreen: [26, 92, 26] as [number,number,number],
        textGray:  [140,140,140] as [number,number,number],
      };

      const PW=297,PH=210,ML=10,MR=10,MT=10;
      const H_TITLE=11,H_SUB=7,H_HDR=7,H_ROW=9.5,BAR_VPAD=1.4;
      const TASK_COL_W=62,DUR_COL_W=22;
      const WEEKS_W=PW-ML-MR-TASK_COL_W-DUR_COL_W;
      const WK_W=WEEKS_W/totalWeeks;
      const x0=ML,durX=x0+TASK_COL_W+WEEKS_W;
      const totalTableW=TASK_COL_W+WEEKS_W+DUR_COL_W;

      // @ts-expect-error jsPDF dynamic import
      const doc = new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
      doc.setFont("helvetica");

      const fr=(x:number,y:number,w:number,h:number,rgb:[number,number,number])=>{doc.setFillColor(...rgb);doc.rect(x,y,w,h,"F");};
      const br=(x:number,y:number,w:number,h:number,rgb:[number,number,number],lw=0.18)=>{doc.setDrawColor(...rgb);doc.setLineWidth(lw);doc.rect(x,y,w,h,"S");};
      const hexRGB=(hex:string):[number,number,number]=>{const h=hex.replace("#","");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
      const txt=(str:string,x:number,y:number,w:number,h:number,opts:{fs?:number;bold?:boolean;italic?:boolean;color?:[number,number,number];align?:"left"|"center"|"right"}={})=>{
        const{fs=8,bold=false,italic=false,color=C.textDark,align="left"}=opts;
        doc.setFontSize(fs);doc.setFont("helvetica",bold?"bold":italic?"italic":"normal");doc.setTextColor(...color);
        const ty=y+h/2+fs*0.175;
        const tx=align==="center"?x+w/2:align==="right"?x+w-2.5:x+2.5;
        const maxW=w-5; let display=str;
        while(display.length>1&&doc.getTextWidth(display)>maxW)display=display.slice(0,-2)+"…";
        doc.text(display,tx,ty,{align});
      };

      let y=MT;
      doc.setFillColor(...C.greenDark);doc.roundedRect(x0,y,totalTableW,H_TITLE,3,3,"F");
      txt(title,x0,y,totalTableW,H_TITLE,{fs:11,bold:true,color:C.white,align:"center"});
      y+=H_TITLE;

      fr(x0,y,totalTableW,H_SUB,C.greenMid);
      txt(`Project Implementation Schedule  |  Total Duration: ${totalWeeks} Weeks`,x0,y,totalTableW,H_SUB,{fs:7.5,italic:true,color:C.white,align:"center"});
      y+=H_SUB;

      fr(x0,y,TASK_COL_W,H_HDR,C.greenDark);txt("Task",x0,y,TASK_COL_W,H_HDR,{fs:8.5,bold:true,color:C.white,align:"center"});br(x0,y,TASK_COL_W,H_HDR,C.greenDark);
      for(let w=0;w<totalWeeks;w++){const cx=x0+TASK_COL_W+w*WK_W;fr(cx,y,WK_W,H_HDR,w<8?C.greenMid:C.greenDark);txt(`W${w+1}`,cx,y,WK_W,H_HDR,{fs:6.5,bold:true,color:C.white,align:"center"});br(cx,y,WK_W,H_HDR,C.greenDark);}
      fr(durX,y,DUR_COL_W,H_HDR,C.greenDark);txt("Duration",durX,y,DUR_COL_W,H_HDR,{fs:7,bold:true,color:C.white,align:"center"});br(durX,y,DUR_COL_W,H_HDR,C.greenDark);
      y+=H_HDR;

      tasks.forEach((task,ti)=>{
        const rowBg=ti%2===1?C.oddBg:C.evenBg; let dur=0;
        fr(x0,y,TASK_COL_W,H_ROW,rowBg);txt(task.name,x0,y,TASK_COL_W,H_ROW,{fs:8,color:C.textDark});br(x0,y,TASK_COL_W,H_ROW,C.borderClr);
        for(let w=0;w<totalWeeks;w++){
          const cx=x0+TASK_COL_W+w*WK_W;fr(cx,y,WK_W,H_ROW,rowBg);
          if(task.cells[w]){const[r,g,b]=hexRGB(task.color);doc.setFillColor(r,g,b);doc.roundedRect(cx+0.7,y+BAR_VPAD,WK_W-1.4,H_ROW-BAR_VPAD*2,1.3,1.3,"F");dur++;}
          br(cx,y,WK_W,H_ROW,C.borderClr);
        }
        fr(durX,y,DUR_COL_W,H_ROW,C.durBg);txt(`${dur} ${dur===1?"wk":"wks"}`,durX,y,DUR_COL_W,H_ROW,{fs:8,bold:true,color:C.textGreen,align:"center"});br(durX,y,DUR_COL_W,H_ROW,C.borderClr);
        y+=H_ROW;
      });

      doc.setDrawColor(...C.greenDark);doc.setLineWidth(0.65);doc.roundedRect(x0,MT,totalTableW,y-MT,3,3,"S");
      doc.setFontSize(6.5);doc.setFont("helvetica","normal");doc.setTextColor(...C.textGray);
      doc.text("Green Power Ltd.  |  Project Gantt Chart",x0,PH-5);
      doc.text(new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),PW-MR,PH-5,{align:"right"});

      const safe=title.replace(/[^a-zA-Z0-9\s]/g,"").trim().replace(/\s+/g,"_");
      doc.save(safe+"_Gantt.pdf");
    } catch(err){ alert("PDF export failed: "+(err as Error).message); }
    finally { setPdfExporting(false); }
  };

  if (!proj) return <div className="p-10 text-gray-500">No projects found.</div>;

  const statusColors: Record<SaveStatus, string> = {
    saved: "text-gp-dark",
    saving: "text-yellow-600",
    error: "text-red-600",
  };
  const statusLabels: Record<SaveStatus, string> = {
    saved: "✓ All changes saved",
    saving: "Saving…",
    error: "⚠ Save error — check connection",
  };

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <h1 className="text-[15px] font-bold text-gp-dark mb-4 flex items-center gap-2">
        🟢 Green Power Ltd. — Gantt Chart Editor
        <span className={`ml-auto text-[11px] font-semibold ${statusColors[saveStatus]}`}>
          {statusLabels[saveStatus]}
        </span>
      </h1>

      {/* Project toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <label className="text-xs font-semibold text-gray-600">Project:</label>
        <select
          className="task-input w-64"
          value={currentIndex}
          onChange={(e) => setCurrentIndex(Number(e.target.value))}
        >
          {projects.map((p, i) => (
            <option key={p.id} value={i}>{p.name || `Project ${i + 1}`}</option>
          ))}
        </select>
        <button className="btn btn-green" onClick={handleNewProject}>+ New Project</button>
        <button className="btn btn-danger" onClick={handleDeleteProject}>🗑 Delete Project</button>
      </div>

      {/* Project title input */}
      <input
        className="w-full text-[13px] px-3 py-[7px] border-[1.5px] border-gray-300 rounded-md mb-3 focus:outline-none focus:border-gp-dark"
        value={proj.name}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Project title..."
      />

      {/* Weeks + task + export toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <label className="text-xs font-semibold text-gray-600">Weeks:</label>
        <button className="num-btn" onClick={() => handleWeekChange(-1)}>−</button>
        <span className="text-[13px] font-bold text-gp-dark min-w-[26px] text-center">{proj.totalWeeks}</span>
        <button className="num-btn" onClick={() => handleWeekChange(1)}>+</button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <input
          className="task-input w-48"
          placeholder="New task name..."
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
        />
        <button className="btn btn-green" onClick={handleAddTask}>+ Add Task</button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          className={`btn btn-green font-bold ${exporting ? "btn-disabled" : ""}`}
          onClick={handleExcelExport}
        >
          {exporting ? "⏳ Generating…" : "⬇ Export to Excel"}
        </button>
        <button
          className={`btn btn-navy font-bold ${pdfExporting ? "btn-disabled" : ""}`}
          onClick={handlePdfExport}
        >
          {pdfExporting ? "⏳ Building PDF…" : "⬇ Export to PDF"}
        </button>
      </div>

      {/* Gantt table */}
      <div className="overflow-x-auto rounded-xl shadow-md">
        <table className="border-collapse bg-white">
          <thead>
            <tr>
              <th className="th-task">Task</th>
              {Array.from({ length: proj.totalWeeks }, (_, i) => (
                <th key={i} className="th-week">W{i + 1}</th>
              ))}
              <th className="th-dur">Duration</th>
            </tr>
          </thead>
          <tbody>
            {proj.tasks.map((task, ti) => {
              const dur = task.cells.filter(Boolean).length;
              const isOdd = ti % 2 === 1;
              return (
                <tr key={task.id} className={isOdd ? "bg-gp-odd" : "bg-white"}>
                  {/* Task name cell */}
                  <td className={`td-task ${isOdd ? "bg-gp-odd" : "bg-white"}`}>
                    <div className="flex items-center gap-[5px] px-[6px] h-[34px]">
                      <span className="text-gray-300 text-[13px] select-none">⠿</span>
                      <input
                        type="color"
                        className="w-6 h-6 p-0 border-none rounded cursor-pointer flex-shrink-0"
                        value={task.color}
                        onChange={(e) => handleTaskColor(task.id, ti, e.target.value)}
                        title="Change bar color"
                      />
                      <input
                        className="flex-1 text-[11px] border-none bg-transparent outline-none cursor-pointer h-full text-gray-800 focus:bg-green-50 focus:rounded focus:px-1 focus:cursor-text"
                        value={task.name}
                        onChange={(e) => handleTaskName(task.id, ti, e.target.value)}
                        title="Click to rename"
                      />
                      <button
                        className="w-5 h-5 border-none bg-none cursor-pointer text-gray-300 text-[15px] flex-shrink-0 rounded flex items-center justify-center hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => handleDeleteTask(task.id, ti)}
                      >
                        ×
                      </button>
                    </div>
                  </td>

                  {/* Week cells */}
                  {task.cells.map((filled, ci) => (
                    <td
                      key={ci}
                      className="td-bar border border-gp-border"
                      onClick={() => handleToggleCell(task.id, ti, ci)}
                    >
                      {filled ? (
                        <span
                          className="h-[26px] rounded-[4px] block transition-[filter] hover:brightness-110"
                          style={{ background: task.color }}
                        />
                      ) : (
                        <span
                          className={`h-[26px] block rounded-[3px] ${isOdd ? "bg-[#eff7ef] hover:bg-[#cce5cc]" : "bg-[#f5f5f5] hover:bg-[#d4ecd4]"} transition-colors`}
                        />
                      )}
                    </td>
                  ))}

                  {/* Duration */}
                  <td className="td-dur border border-gp-border">
                    {dur}{dur === 1 ? " wk" : " wks"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hint */}
      <p className="text-[11px] text-gray-400 mt-2">
        💡 Click any week cell to toggle on/off &nbsp;•&nbsp; Click task name to rename &nbsp;•&nbsp;
        Click the color swatch to change bar color &nbsp;•&nbsp; Use − / + to add or remove weeks &nbsp;•&nbsp;
        All changes save automatically to the database.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {proj.tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-[5px] text-[11px] text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
            <div className="w-[11px] h-[11px] rounded-sm flex-shrink-0" style={{ background: t.color }} />
            <span>{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
