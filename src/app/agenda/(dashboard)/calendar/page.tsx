"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Cards from "@cloudscape-design/components/cards";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Link from "@cloudscape-design/components/link";
import Container from "@cloudscape-design/components/container";
import Modal from "@cloudscape-design/components/modal";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
}

// ─── Constants & Helpers ────────────────────────────────────────────────────────

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getEventDateKey(event: CalendarEvent): string | null {
  const dateStr = event.start.dateTime || event.start.date;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return toDateKey(d);
}

function formatNiceDate(dateKey: string | null) {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-");
  const monthName = MONTH_NAMES[parseInt(m, 10) - 1];
  return `${parseInt(d, 10)} de ${monthName} de ${y}`;
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

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar State
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDateKey, setModalDateKey] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
    const calendarId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID;

    if (!apiKey || !calendarId) {
      setError("Las credenciales del calendario no están configuradas en el .env.local.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Obtenemos los eventos desde hace 1 mes hasta dentro de 1 año (para que el calendario pueda poblar algunos del pasado reciente tmb)
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1);
      
      const timeMax = new Date();
      timeMax.setFullYear(timeMax.getFullYear() + 1);
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=250`;

      const response = await fetch(url);
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Error de permisos al conectar con Google Calendar");
      }

      const data = await response.json();
      setEvents(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los eventos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // Transform events for calendar render
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  
  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(e => {
      const key = getEventDateKey(e);
      if (key) {
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      }
    });
    return map;
  }, [events]);

  // Formateador amigable de fechas para la lista
  const formatEventDate = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return "Fecha desconocida";
    const date = new Date(start);
    
    if (!event.start.dateTime) {
      return date.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" });
    }
    return date.toLocaleString("es-ES", { weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const modalEvents = modalDateKey ? (eventsMap.get(modalDateKey) || []) : [];
  const upcomingEvents = events.filter(e => {
    const dateStr = e.start.dateTime || e.start.date;
    return dateStr ? new Date(dateStr) >= new Date() : false;
  }).slice(0, 10); // Mostrar los próximos 10 en la lista

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Eventos sincronizados con tu Google Calendar"
      >
        Calendario Laboral/Personal
      </Header>

      {error && (
        <Alert type="error" dismissible onDismiss={() => setError(null)}>
          {error}
          <Box margin={{ top: "xs" }}>Verifica que el calendario es PÚBLICO y que el API Key y el ID están correctos.</Box>
        </Alert>
      )}

      {/* ── Visual Calendar Grid ───────────────────────────────── */}
      {!error && (
        <Container>
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Button iconName="angle-left" variant="icon" onClick={prevMonth} ariaLabel="Mes anterior" />
              <div style={{ textAlign: "center", fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>
              <Button iconName="angle-right" variant="icon" onClick={nextMonth} ariaLabel="Mes siguiente" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, userSelect: "none" }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ textAlign: "center", fontWeight: 600, fontSize: 13, padding: "8px 0", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                  {d}
                </div>
              ))}

              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} style={{ aspectRatio: "1 / 1" }} />;
                
                const dateKey = toDateKey(day);
                const dayEvents = eventsMap.get(dateKey) || [];
                const isToday = dateKey === toDateKey(today);

                return (
                  <div
                    key={dateKey}
                    onClick={() => {
                      if (dayEvents.length > 0) {
                        setModalDateKey(dateKey);
                        setModalVisible(true);
                      }
                    }}
                    style={{
                      position: "relative",
                      aspectRatio: "1 / 1",
                      borderRadius: 12,
                      backgroundColor: isToday ? "rgba(66, 165, 245, 0.15)" : "rgba(255,255,255,0.05)",
                      border: isToday ? "2px solid #42A5F5" : "none",
                      cursor: dayEvents.length > 0 ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.15s ease",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                    onMouseOver={e => dayEvents.length > 0 && (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: dayEvents.length > 0 ? "#fff" : "rgba(255,255,255,0.6)" }}>
                      {day.getDate()}
                    </span>
                    
                    {/* Event indicators */}
                    {dayEvents.length > 0 && (
                      <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                        {dayEvents.slice(0, 3).map((e, index) => (
                          <div key={index} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: isToday ? "#42A5F5" : "#64B5F6" }} />
                        ))}
                        {dayEvents.length > 3 && <span style={{ fontSize: 9, color: "#64B5F6", lineHeight: "6px" }}>+</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      )}

      {/* ── Upcoming Events List ───────────────────────────────── */}
      {!error && upcomingEvents.length > 0 && (
        <Cards
          items={upcomingEvents}
          loading={loading}
          cardDefinition={{
            header: (item) => <Link href={item.htmlLink} external fontSize="heading-m">{item.summary || "(Sin título)"}</Link>,
            sections: [
              {
                id: "date",
                content: (item) => <Box color="text-label" fontWeight="bold"><span style={{ textTransform: "capitalize" }}>{formatEventDate(item)}</span></Box>
              },
              {
                id: "location",
                header: "Lugar",
                content: (item) => item.location ? <Link href={`https://maps.google.com/?q=${encodeURIComponent(item.location)}`} external>{item.location}</Link> : <span style={{ opacity: 0.4 }}>—</span>
              },
              {
                id: "desc",
                header: "Detalles",
                content: (item) => item.description ? <Box color="text-body-secondary"><div style={{ whiteSpace: "pre-line", maxHeight: "100px", overflow: "hidden", textOverflow: "ellipsis" }} dangerouslySetInnerHTML={{ __html: item.description }} /></Box> : <span style={{ opacity: 0.4 }}>Sin detalles extra</span>
              }
            ]
          }}
          cardsPerRow={[{ cards: 1 }, { minWidth: 600, cards: 2 }, { minWidth: 900, cards: 3 }]}
        />
      )}

      {/* ── Modal: Day Events ──────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        header={`Eventos del ${formatNiceDate(modalDateKey)}`}
        footer={<Box float="right"><Button variant="primary" onClick={() => setModalVisible(false)}>Cerrar</Button></Box>}
      >
        <SpaceBetween size="m">
          {modalEvents.length === 0 ? (
            <Box color="text-body-secondary" textAlign="center" padding="l">No hay eventos para este día.</Box>
          ) : (
            modalEvents.map(item => (
              <div key={item.id} style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", padding: "16px" }}>
                <Box fontSize="heading-s">
                  <Link href={item.htmlLink} external>{item.summary || "(Sin título)"}</Link>
                </Box>
                <Box color="text-body-secondary" fontSize="body-s" margin={{ top: "xs", bottom: "xs" }}>
                  <span style={{ textTransform: "capitalize" }}>{formatEventDate(item)}</span>
                </Box>
                {item.location && <Box margin={{ top: "xs" }}>📍 <Link href={`https://maps.google.com/?q=${encodeURIComponent(item.location)}`} external>{item.location}</Link></Box>}
                {item.description && (
                  <Box margin={{ top: "s" }} color="text-body-secondary" fontSize="body-s">
                    <div dangerouslySetInnerHTML={{ __html: item.description }} style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.1)" }} />
                  </Box>
                )}
              </div>
            ))
          )}
        </SpaceBetween>
      </Modal>

    </SpaceBetween>
  );
}
