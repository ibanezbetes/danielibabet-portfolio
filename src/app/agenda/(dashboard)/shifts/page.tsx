"use client";

/**
 * CALENDARIO LABORAL — Shift-painting calendar (Shifter-style)
 *
 * 1. Define shift types (name, abbreviation, color, start/end times)
 * 2. Select a shift type, then click/drag on calendar days to "paint" them
 * 3. Support for 2 shifts per day (paint twice with different colors)
 * 4. Support for tips pop-up (click without a shift selected)
 * 5. Persists to DynamoDB (agenda-shift-types + agenda-shift-entries)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoDBClient } from "@/lib/dynamodb-client";
import { TABLES } from "@/lib/aws-config";
import { useAgendaAuth } from "@/context/AgendaAuthContext";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import FormField from "@cloudscape-design/components/form-field";
import Form from "@cloudscape-design/components/form";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ShiftType {
  shiftTypeId: string;
  name: string;
  abbreviation: string;
  color: string;
  startTime: string;
  endTime: string;
  order: number;
  createdAt: string;
}

interface HourTrack {
  start: string;
  end: string;
  breakMinutes: number;
}

interface ShiftEntry {
  dateKey: string;        // YYYY-MM-DD
  shiftTypeIds: string[]; // up to 2
  shiftTypeId?: string;   // legacy fallback
  tips?: number;
  nttData?: HourTrack;
  bingo?: HourTrack;
  updatedAt: string;
}

// ─── Default shift types ────────────────────────────────────────────────────────

const DEFAULT_SHIFTS: Omit<ShiftType, "shiftTypeId" | "createdAt">[] = [
  { name: "Mañana",  abbreviation: "M", color: "#4CAF50", startTime: "06:00", endTime: "14:00", order: 0 },
  { name: "Tarde",   abbreviation: "T", color: "#2196F3", startTime: "14:00", endTime: "22:00", order: 1 },
  { name: "Noche",   abbreviation: "N", color: "#9C27B0", startTime: "22:00", endTime: "06:00", order: 2 },
  { name: "Libre",   abbreviation: "L", color: "#78909C", startTime: "",      endTime: "",      order: 3 },
];

const COLOR_PALETTE = [
  "#4CAF50", "#2196F3", "#9C27B0", "#FF9800",
  "#F44336", "#00BCD4", "#E91E63", "#78909C",
  "#8BC34A", "#3F51B5", "#FF5722", "#009688",
  "#FFC107", "#673AB7", "#795548", "#607D8B",
];

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function parseMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60) + m;
}

function calculateDiffHours(track?: HourTrack): number {
  if (!track || !track.start || !track.end) return 0;
  const startMin = parseMinutes(track.start);
  const endMin = parseMinutes(track.end);
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60; // night shift or next day
  diff -= (track.breakMinutes || 0);
  return Math.max(0, diff / 60);
}

function formatDateKey(dateKey: string | null) {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-");
  const monthName = MONTH_NAMES[parseInt(m, 10) - 1];
  return `${parseInt(d, 10)} ${monthName} ${y}`;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

// ─── LocalStorage fallback helpers ──────────────────────────────────────────────

const LS_SHIFT_TYPES_KEY = "agenda_shift_types";
const LS_SHIFT_ENTRIES_KEY = "agenda_shift_entries";

function lsLoadShiftTypes(): ShiftType[] {
  try {
    const raw = localStorage.getItem(LS_SHIFT_TYPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function lsSaveShiftTypes(types: ShiftType[]) {
  localStorage.setItem(LS_SHIFT_TYPES_KEY, JSON.stringify(types));
}

function lsLoadShiftEntries(): ShiftEntry[] {
  try {
    const raw = localStorage.getItem(LS_SHIFT_ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function lsSaveShiftEntries(entries: ShiftEntry[]) {
  localStorage.setItem(LS_SHIFT_ENTRIES_KEY, JSON.stringify(entries));
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const { tokens } = useAgendaAuth();

  // State
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [entries, setEntries] = useState<Map<string, ShiftEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDynamo, setUseDynamo] = useState(true);

  // Calendar navigation
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Painting
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Modal Tipos de turno
  const [modalVisible, setModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null);
  const [formName, setFormName] = useState("");
  const [formAbbr, setFormAbbr] = useState("");
  const [formColor, setFormColor] = useState(COLOR_PALETTE[0]);
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal Propinas y Horas
  const [tipsModalVisible, setTipsModalVisible] = useState(false);
  const [tipsDateKey, setTipsDateKey] = useState<string | null>(null);
  const [formTips, setFormTips] = useState("");
  const [showAnnualTips, setShowAnnualTips] = useState(false);

  // Hour tracking forms
  const [formNttStart, setFormNttStart] = useState("");
  const [formNttEnd, setFormNttEnd] = useState("");
  const [formNttBreak, setFormNttBreak] = useState("0");
  const [formBingoStart, setFormBingoStart] = useState("");
  const [formBingoEnd, setFormBingoEnd] = useState("");
  const [formBingoBreak, setFormBingoBreak] = useState("0");

  // ─── DynamoDB client ────────────────────────────────────────────────────────

  const getClient = useCallback(() => {
    if (!tokens?.idToken) throw new Error("No autenticado");
    return createDynamoDBClient(tokens.idToken);
  }, [tokens]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const migrateEntries = (arr: any[]): ShiftEntry[] => {
      return arr.map(e => ({
        ...e,
        shiftTypeIds: e.shiftTypeIds || (e.shiftTypeId ? [e.shiftTypeId] : []),
      }));
    };

    try {
      const client = getClient();

      const typesResult = await client.send(new ScanCommand({ TableName: TABLES.SHIFT_TYPES }));
      let types = (typesResult.Items ?? []) as ShiftType[];

      if (types.length === 0) {
        types = DEFAULT_SHIFTS.map((d, i) => ({
          ...d, shiftTypeId: uuidv4(), createdAt: new Date().toISOString(), order: i,
        }));
        await Promise.all(types.map((t) => client.send(new PutCommand({ TableName: TABLES.SHIFT_TYPES, Item: t }))));
      }
      types.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setShiftTypes(types);

      const entriesResult = await client.send(new ScanCommand({ TableName: TABLES.SHIFT_ENTRIES }));
      const entriesArr = migrateEntries(entriesResult.Items ?? []);
      const entriesMap = new Map<string, ShiftEntry>();
      entriesArr.forEach((e) => entriesMap.set(e.dateKey, e));
      setEntries(entriesMap);
      setUseDynamo(true);
    } catch {
      console.warn("DynamoDB unavailable, falling back to localStorage");
      setUseDynamo(false);

      let types = lsLoadShiftTypes();
      if (types.length === 0) {
        types = DEFAULT_SHIFTS.map((d, i) => ({
          ...d, shiftTypeId: uuidv4(), createdAt: new Date().toISOString(), order: i,
        }));
        lsSaveShiftTypes(types);
      }
      setShiftTypes(types);

      const lsEntries = migrateEntries(lsLoadShiftEntries());
      const entriesMap = new Map<string, ShiftEntry>();
      lsEntries.forEach((e) => entriesMap.set(e.dateKey, e));
      setEntries(entriesMap);
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ─── Paint handler ──────────────────────────────────────────────────────────

  const paintDay = useCallback(async (dateKey: string, forceToggle = false) => {
    if (!activeShiftId) return;

    const existing = entries.get(dateKey);
    // Filtramos turnos huérfanos que pudieran haber sido eliminados
    let newShiftTypeIds = [...(existing?.shiftTypeIds || [])].filter(id => shiftTypes.some(t => t.shiftTypeId === id));

    if (newShiftTypeIds.includes(activeShiftId)) {
      // Toggle off if it already exists
      newShiftTypeIds = newShiftTypeIds.filter(id => id !== activeShiftId);
    } else {
      // Add or replace
      if (newShiftTypeIds.length < 2) {
        newShiftTypeIds.push(activeShiftId);
      } else {
        newShiftTypeIds = [activeShiftId]; // Reemplaza todo si ya había 2
      }
    }

    // If completely empty and no tips, we can just delete it
    if (newShiftTypeIds.length === 0 && (!existing?.tips)) {
      const newMap = new Map(entries);
      newMap.delete(dateKey);
      setEntries(newMap);
      try {
        if (useDynamo) {
          await getClient().send(new DeleteCommand({ TableName: TABLES.SHIFT_ENTRIES, Key: { dateKey } }));
        } else lsSaveShiftEntries(Array.from(newMap.values()));
      } catch (err) { setError(err instanceof Error ? err.message : "Error al borrar."); }
      return;
    }

    const newEntry: ShiftEntry = {
      dateKey,
      shiftTypeIds: newShiftTypeIds,
      tips: existing?.tips,
      updatedAt: new Date().toISOString(),
    };

    const newMap = new Map(entries);
    newMap.set(dateKey, newEntry);
    setEntries(newMap);

    try {
      if (useDynamo) {
        await getClient().send(new PutCommand({ TableName: TABLES.SHIFT_ENTRIES, Item: newEntry }));
      } else lsSaveShiftEntries(Array.from(newMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar turno.");
    }
  }, [entries, activeShiftId, useDynamo, getClient, shiftTypes]);

  // ─── Drag painting ─────────────────────────────────────────────────────────

  function handleMouseDown(dateKey: string) {
    if (!activeShiftId) {
      // Abre Pop-up propinas si no hay turno seleccionado
      const existing = entries.get(dateKey);
      setTipsDateKey(dateKey);
      setFormTips(existing?.tips ? String(existing.tips) : "");
      setFormNttStart(existing?.nttData?.start || "");
      setFormNttEnd(existing?.nttData?.end || "");
      setFormNttBreak(existing?.nttData?.breakMinutes ? String(existing.nttData.breakMinutes) : "0");
      setFormBingoStart(existing?.bingo?.start || "");
      setFormBingoEnd(existing?.bingo?.end || "");
      setFormBingoBreak(existing?.bingo?.breakMinutes ? String(existing.bingo.breakMinutes) : "0");
      setTipsModalVisible(true);
      return;
    }
    setIsPainting(true);
    void paintDay(dateKey, true);
  }

  function handleMouseEnter(dateKey: string) {
    if (isPainting && activeShiftId) {
      void paintDay(dateKey, false);
    }
  }

  useEffect(() => {
    function handleMouseUp() { setIsPainting(false); }
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // ─── Shift type CRUD ───────────────────────────────────────────────────────

  function toggleShiftSelection(id: string) {
    setActiveShiftId(prev => (prev === id ? null : id));
  }

  function openCreateModal() {
    setEditingShift(null);
    setFormName("");
    setFormAbbr("");
    setFormColor(COLOR_PALETTE[0]);
    setFormStart("");
    setFormEnd("");
    setModalVisible(true);
  }

  function openEditModal(shift: ShiftType, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingShift(shift);
    setFormName(shift.name);
    setFormAbbr(shift.abbreviation);
    setFormColor(shift.color);
    setFormStart(shift.startTime);
    setFormEnd(shift.endTime);
    setModalVisible(true);
  }

  async function handleSaveShiftType() {
    if (!formName.trim() || !formAbbr.trim()) return;
    setSubmitting(true);

    const shiftType: ShiftType = {
      shiftTypeId: editingShift?.shiftTypeId ?? uuidv4(),
      name: formName.trim(),
      abbreviation: formAbbr.trim().toUpperCase(),
      color: formColor,
      startTime: formStart,
      endTime: formEnd,
      order: editingShift?.order ?? shiftTypes.length,
      createdAt: editingShift?.createdAt ?? new Date().toISOString(),
    };

    try {
      if (useDynamo) await getClient().send(new PutCommand({ TableName: TABLES.SHIFT_TYPES, Item: shiftType }));
      const newTypes = editingShift
        ? shiftTypes.map((t) => (t.shiftTypeId === shiftType.shiftTypeId ? shiftType : t))
        : [...shiftTypes, shiftType];
      newTypes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setShiftTypes(newTypes);
      if (!useDynamo) lsSaveShiftTypes(newTypes);
      setModalVisible(false);
    } catch (err) { setError(String(err)); } finally { setSubmitting(false); }
  }

  async function handleDeleteShiftType() {
    if (!editingShift) return;
    setSubmitting(true);

    try {
      if (useDynamo) {
        await getClient().send(new DeleteCommand({ TableName: TABLES.SHIFT_TYPES, Key: { shiftTypeId: editingShift.shiftTypeId } }));
      }
      const newTypes = shiftTypes.filter((t) => t.shiftTypeId !== editingShift.shiftTypeId);
      setShiftTypes(newTypes);
      if (!useDynamo) lsSaveShiftTypes(newTypes);
      if (activeShiftId === editingShift.shiftTypeId) setActiveShiftId(null);
      setModalVisible(false);
    } catch (err) { setError(String(err)); } finally { setSubmitting(false); }
  }

  // ─── Propinas Handler ──────────────────────────────────────────────────────

  async function handleSaveTips() {
    if (!tipsDateKey) return;
    setSubmitting(true);
    
    const parsedTips = parseFloat(formTips);
    const existing = entries.get(tipsDateKey);
    const existingShifts = existing?.shiftTypeIds || [];

    let nttData: HourTrack | undefined;
    if (formNttStart && formNttEnd) {
       nttData = { start: formNttStart, end: formNttEnd, breakMinutes: parseInt(formNttBreak) || 0 };
    }
    
    let bingo: HourTrack | undefined;
    if (formBingoStart && formBingoEnd) {
       bingo = { start: formBingoStart, end: formBingoEnd, breakMinutes: parseInt(formBingoBreak) || 0 };
    }

    // Si no hay turnos y las propinas quedan vacías, borramos la entrada.
    if (existingShifts.length === 0 && (isNaN(parsedTips) || formTips.trim() === "") && !nttData && !bingo) {
      const newMap = new Map(entries);
      newMap.delete(tipsDateKey);
      setEntries(newMap);
      try {
        if (useDynamo) await getClient().send(new DeleteCommand({ TableName: TABLES.SHIFT_ENTRIES, Key: { dateKey: tipsDateKey } }));
        else lsSaveShiftEntries(Array.from(newMap.values()));
      } catch (err) { setError(String(err)); }
      setSubmitting(false);
      setTipsModalVisible(false);
      return;
    }

    const newEntry: ShiftEntry = {
      dateKey: tipsDateKey,
      shiftTypeIds: existingShifts,
      tips: isNaN(parsedTips) ? undefined : parsedTips,
      nttData,
      bingo,
      updatedAt: new Date().toISOString(),
    };

    const newMap = new Map(entries);
    newMap.set(tipsDateKey, newEntry);
    setEntries(newMap);

    try {
      if (useDynamo) await getClient().send(new PutCommand({ TableName: TABLES.SHIFT_ENTRIES, Item: newEntry }));
      else lsSaveShiftEntries(Array.from(newMap.values()));
      setTipsModalVisible(false);
    } catch (err) { setError(String(err)); } finally { setSubmitting(false); }
  }

  // ─── Data parsing ──────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const shiftTypesMap = useMemo(() => {
    const m = new Map<string, ShiftType>();
    shiftTypes.forEach((t) => m.set(t.shiftTypeId, t));
    return m;
  }, [shiftTypes]);

  const { totalTips, totalNttHours, totalBingoHours } = useMemo(() => {
    let sumTips = 0;
    let nttH = 0;
    let bingoH = 0;
    for (const day of calendarDays) {
      if (!day) continue;
      const entry = entries.get(toDateKey(day));
      if (entry?.tips) sumTips += entry.tips;
      if (entry?.nttData) nttH += calculateDiffHours(entry.nttData);
      if (entry?.bingo) bingoH += calculateDiffHours(entry.bingo);
    }
    return { totalTips: sumTips, totalNttHours: nttH, totalBingoHours: bingoH };
  }, [calendarDays, entries]);

  const { annualTips, annualNttHours, annualBingoHours } = useMemo(() => {
    let sumTips = 0;
    let nttH = 0;
    let bingoH = 0;
    const yearPrefix = viewYear.toString();
    for (const [dateKey, entry] of entries.entries()) {
      if (dateKey.startsWith(yearPrefix)) {
        if (entry.tips) sumTips += entry.tips;
        if (entry.nttData) nttH += calculateDiffHours(entry.nttData);
        if (entry.bingo) bingoH += calculateDiffHours(entry.bingo);
      }
    }
    return { annualTips: sumTips, annualNttHours: nttH, annualBingoHours: bingoH };
  }, [entries, viewYear]);

  // ─── Navigation handlers ───────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <Box textAlign="center" padding="xl"><span style={{ fontSize: 18, opacity: 0.6 }}>Cargando calendario laboral...</span></Box>;
  }

  const todayKey = toDateKey(today);

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Selecciona un turno para pintar días, o haz clic en un día (sin turno seleccionado) para añadir propinas."
      >
        Calendario Laboral
      </Header>

      {!useDynamo && null}
      {error && <Alert type="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}



      {/* ── Calendar Grid ───────────────────────────────────────────── */}
      <Container>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Button iconName="angle-left" variant="icon" onClick={prevMonth} ariaLabel="Mes anterior" />
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <Button iconName="angle-right" variant="icon" onClick={nextMonth} ariaLabel="Mes siguiente" />
        </div>

        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div
            ref={calendarRef}
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, userSelect: "none" }}
            onMouseLeave={() => setIsPainting(false)}
          >
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: "center", fontWeight: 600, fontSize: 13, padding: "8px 0", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                {d}
              </div>
            ))}

            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} style={{ aspectRatio: "1 / 1" }} />;

              const dateKey = toDateKey(day);
              const entry = entries.get(dateKey);
              // Filtramos turnos huérfanos que hayan sido borrados de Tipos de Turno
              const dayShiftIds = (entry?.shiftTypeIds || []).filter(id => shiftTypesMap.has(id));
              const isToday = dateKey === todayKey;

              // Determinar color de fondo según 0, 1 o 2 turnos
              let background = "rgba(255,255,255,0.05)"; // vacio
              
              if (dayShiftIds.length === 1) {
                 const s1 = shiftTypesMap.get(dayShiftIds[0]);
                 if(s1) background = s1.color;
              } else if (dayShiftIds.length === 2) {
                 const s1 = shiftTypesMap.get(dayShiftIds[0]);
                 const s2 = shiftTypesMap.get(dayShiftIds[1]);
                 if(s1 && s2) {
                    // Diagonal dividida exacta
                    background = `linear-gradient(135deg, ${s1.color} 50%, ${s2.color} 50%)`;
                 }
              }

              return (
                <div
                  key={dateKey}
                  onMouseDown={(e) => { e.preventDefault(); handleMouseDown(dateKey); }}
                  onMouseEnter={() => handleMouseEnter(dateKey)}
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    background,
                    border: isToday ? "2px solid #fff" : "none",
                    cursor: activeShiftId ? "crosshair" : "pointer",
                    transition: "transform 0.1s ease",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLDivElement).style.zIndex = "2"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; (e.currentTarget as HTMLDivElement).style.zIndex = "1"; }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: dayShiftIds.length > 0 ? "#fff" : "rgba(255,255,255,0.8)",
                      textShadow: dayShiftIds.length > 0 ? "0 1px 3px rgba(0,0,0,0.6)" : "none",
                    }}
                  >
                    {day.getDate()}
                  </span>

                  {/* Mostrar propinas si existen */}
                  {entry?.tips !== undefined && entry.tips > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 4,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#ffd700",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        padding: "1px 6px",
                        borderRadius: 10,
                      }}
                    >
                      {entry.tips}€
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Container>

      {/* ── Resumen Mensual / Anual ─────────────────────────────────── */}
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            onClick={() => setShowAnnualTips(!showAnnualTips)}
            style={{ display: "inline-block", cursor: "pointer", userSelect: "none", width: "fit-content" }}
            title="Haz clic para alternar entre vista Mensual y Anual"
          >
            <div style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
              Resumen {showAnnualTips ? "Anual" : "Mensual"} <span style={{ fontSize: 14, opacity: 0.6 }}>(Click para cambiar)</span>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ padding: 16, backgroundColor: "rgba(76, 175, 80, 0.1)", borderRadius: 12, border: "1px solid rgba(76, 175, 80, 0.3)" }}>
              <div style={{ fontSize: 14, color: "#A5D6A7", marginBottom: 4 }}>Propinas {showAnnualTips ? "Anuales" : "Mensuales"}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#4CAF50" }}>
                {(showAnnualTips ? annualTips : totalTips).toFixed(2)} €
              </div>
            </div>

            <div style={{ padding: 16, backgroundColor: "rgba(33, 150, 243, 0.1)", borderRadius: 12, border: "1px solid rgba(33, 150, 243, 0.3)" }}>
              <div style={{ fontSize: 14, color: "#90CAF9", marginBottom: 4 }}>Horas NTT Data</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#2196F3" }}>
                {(showAnnualTips ? annualNttHours : totalNttHours).toFixed(1)} h
              </div>
            </div>

            <div style={{ padding: 16, backgroundColor: "rgba(156, 39, 176, 0.1)", borderRadius: 12, border: "1px solid rgba(156, 39, 176, 0.3)" }}>
              <div style={{ fontSize: 14, color: "#CE93D8", marginBottom: 4 }}>Horas Bingo Ciclista</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#9C27B0" }}>
                {(showAnnualTips ? annualBingoHours : totalBingoHours).toFixed(1)} h
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* ── Shift Type Selector ─────────────────────────────────────── */}
      <Container
        header={
          <Header variant="h2" actions={<Button iconName="add-plus" onClick={openCreateModal}>Nuevo turno</Button>}>
            Tipos de Turno
          </Header>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {shiftTypes.map((shift) => {
            const isActive = activeShiftId === shift.shiftTypeId;
            return (
              <div
                key={shift.shiftTypeId}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderRadius: 8,
                  border: isActive ? `2px solid ${shift.color}` : "2px solid rgba(255,255,255,0.1)",
                  backgroundColor: isActive ? `${shift.color}22` : "rgba(255,255,255,0.05)",
                  transition: "all 0.2s ease",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  boxShadow: isActive ? `0 0 12px ${shift.color}55` : "none",
                  overflow: "hidden",
                }}
              >
                {/* Botón principal de selección */}
                <button
                  onClick={() => toggleShiftSelection(shift.shiftTypeId)}
                  title={`${shift.name}${shift.startTime ? ` (${shift.startTime}–${shift.endTime})` : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "none", border: "none", color: "#e0e0e0",
                    cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 24, height: 24, borderRadius: 4,
                      backgroundColor: shift.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 12, color: "#fff",
                      textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                    }}
                  >
                    {shift.abbreviation}
                  </span>
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{shift.name}</span>
                </button>
                {/* Botón de edición explicito */}
                <button
                  onClick={(e) => openEditModal(shift, e)}
                  title="Editar turno"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 8px", background: "rgba(255,255,255,0.08)", border: "none", borderLeft: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)", cursor: "pointer", transition: "color 0.2s ease",
                  }}
                  onMouseOver={e => e.currentTarget.style.color = "#fff"}
                  onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
                >
                  ✏️
                </button>
              </div>
            );
          })}
        </div>

        {!activeShiftId && (
          <Box margin={{ top: "s" }} color="text-body-secondary" fontSize="body-s">
            <i>No tienes ningún turno seleccionado. Haz clic en un día del calendario para añadir propinas.</i>
          </Box>
        )}
      </Container>

      {/* ── Modal: Pop-up de Propinas ─────────────────────────── */}
      <Modal
        visible={tipsModalVisible}
        onDismiss={() => setTipsModalVisible(false)}
        header={`Día: ${formatDateKey(tipsDateKey)}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setTipsModalVisible(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveTips} loading={submitting}>Guardar día</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {(() => {
            const entry = tipsDateKey ? entries.get(tipsDateKey) : null;
            const dayShiftIds = entry?.shiftTypeIds || [];
            
            const hasNtt = dayShiftIds.some(id => {
              const name = shiftTypesMap.get(id)?.name.toLowerCase() || "";
              return name.includes("mañana") || name.includes("ntt");
            });
            const hasBingo = dayShiftIds.some(id => {
              const name = shiftTypesMap.get(id)?.name.toLowerCase() || "";
              return name.includes("tarde") || name.includes("noche") || name.includes("bingo");
            });

            return (
              <Form>
                <SpaceBetween size="l">
                  {hasNtt && (
                    <Container header={<Header variant="h3">Horas NTT Data</Header>}>
                      <SpaceBetween direction="horizontal" size="m">
                        <FormField label="Hora inicio"><Input placeholder="HH:mm" value={formNttStart} onChange={e => setFormNttStart(e.detail.value)} disabled={submitting} /></FormField>
                        <FormField label="Hora fin"><Input placeholder="HH:mm" value={formNttEnd} onChange={e => setFormNttEnd(e.detail.value)} disabled={submitting} /></FormField>
                        <FormField label="Descanso (min)"><Input type="number" value={formNttBreak} onChange={e => setFormNttBreak(e.detail.value)} disabled={submitting} /></FormField>
                      </SpaceBetween>
                    </Container>
                  )}
                  
                  {hasBingo && (
                    <Container header={<Header variant="h3">Horas Bingo Ciclista</Header>}>
                      <SpaceBetween direction="horizontal" size="m">
                        <FormField label="Hora inicio"><Input placeholder="HH:mm" value={formBingoStart} onChange={e => setFormBingoStart(e.detail.value)} disabled={submitting} /></FormField>
                        <FormField label="Hora fin"><Input placeholder="HH:mm" value={formBingoEnd} onChange={e => setFormBingoEnd(e.detail.value)} disabled={submitting} /></FormField>
                        <FormField label="Descanso (min)"><Input type="number" value={formBingoBreak} onChange={e => setFormBingoBreak(e.detail.value)} disabled={submitting} /></FormField>
                      </SpaceBetween>
                    </Container>
                  )}

                  <FormField label="Propinas (€)" description="Ingresa la cantidad ganada en propinas. Deja vacío para borrar.">
                    <Input
                      type="number"
                      value={formTips}
                      onChange={(e) => setFormTips(e.detail.value)}
                      placeholder="Ej. 15.50"
                      disabled={submitting}
                    />
                  </FormField>
                </SpaceBetween>
              </Form>
            );
          })()}
        </SpaceBetween>
      </Modal>

      {/* ── Modal: Create / Edit Shift Type ─────────────────────────── */}
      <Modal
         visible={modalVisible}
         onDismiss={() => setModalVisible(false)}
         header={editingShift ? "Editar Tipo de Turno" : "Nuevo Tipo de Turno"}
         footer={
           <Box float="right">
             <SpaceBetween direction="horizontal" size="xs">
               {editingShift && (
                 <Button variant="normal" onClick={handleDeleteShiftType} loading={submitting}>Eliminar</Button>
               )}
               <Button variant="link" onClick={() => setModalVisible(false)}>Cancelar</Button>
               <Button variant="primary" onClick={handleSaveShiftType} loading={submitting} disabled={!formName.trim() || !formAbbr.trim()}>
                 {editingShift ? "Guardar cambios" : "Crear turno"}
               </Button>
             </SpaceBetween>
           </Box>
         }
      >
        <Form>
          <SpaceBetween size="m">
            <FormField label="Nombre del turno"><Input value={formName} onChange={(e) => setFormName(e.detail.value)} disabled={submitting} /></FormField>
            <FormField label="Abreviatura" constraintText="2-3 letras"><Input value={formAbbr} onChange={(e) => setFormAbbr(e.detail.value.slice(0, 3))} disabled={submitting} /></FormField>
            <FormField label="Color">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COLOR_PALETTE.map((c) => (
                  <button key={c} onClick={() => setFormColor(c)} style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: c, border: formColor === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer", transition: "all 0.15s ease", transform: formColor === c ? "scale(1.15)" : "scale(1)", boxShadow: formColor === c ? `0 0 8px ${c}88` : "none" }} type="button" />
                ))}
              </div>
            </FormField>
            <SpaceBetween direction="horizontal" size="m">
              <FormField label="Hora inicio (opcional)"><Input value={formStart} onChange={(e) => setFormStart(e.detail.value)} disabled={submitting} /></FormField>
              <FormField label="Hora fin (opcional)"><Input value={formEnd} onChange={(e) => setFormEnd(e.detail.value)} disabled={submitting} /></FormField>
            </SpaceBetween>
          </SpaceBetween>
        </Form>
      </Modal>
    </SpaceBetween>
  );
}
