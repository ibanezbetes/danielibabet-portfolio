"use client";

import React, { useEffect, useState, useCallback } from "react";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Cards from "@cloudscape-design/components/cards";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Link from "@cloudscape-design/components/link";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Obtenemos los eventos desde hoy hasta dentro de un año
      const timeMin = new Date().toISOString();
      const timeMax = new Date();
      timeMax.setFullYear(timeMax.getFullYear() + 1);
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`;

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

  // Formateador amigable de fechas
  const formatEventDate = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return "Fecha desconocida";
    const date = new Date(start);
    
    // Si es un evento de todo un día (solo envía 'date' sin hora)
    if (!event.start.dateTime) {
      return date.toLocaleDateString("es-ES", { 
        weekday: "long", day: "2-digit", month: "long" 
      });
    }

    return date.toLocaleString("es-ES", {
      weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Próximos eventos (Google Calendar API)"
        actions={
          <Button iconName="refresh" onClick={fetchEvents} loading={loading}>
            Actualizar
          </Button>
        }
      >
        Calendario Laboral/Personal
      </Header>

      {error && (
        <Alert type="error" dismissible onDismiss={() => setError(null)}>
          {error}
          <Box margin={{ top: "xs" }}>
            Verifica que el calendario es PÚBLICO y que el API Key y el ID están correctos en tu archivo de entorno.
          </Box>
        </Alert>
      )}

      {!error && (
        <Cards
          items={events}
          loading={loading}
          loadingText="Cargando tus citas..."
          empty={
            <Box textAlign="center" color="text-body-secondary" padding="xl">
              <b>No hay eventos próximos</b>
              <Box variant="p">Tienes el calendario limpio.</Box>
            </Box>
          }
          cardDefinition={{
            header: (item) => (
              <Link href={item.htmlLink} external fontSize="heading-m">
                {item.summary || "(Sin título)"}
              </Link>
            ),
            sections: [
              {
                id: "date",
                header: "",
                content: (item) => (
                  <Box color="text-label" fontWeight="bold" style={{ textTransform: "capitalize" }}>
                    {formatEventDate(item)}
                  </Box>
                )
              },
              {
                id: "location",
                header: "Lugar",
                content: (item) => (
                  item.location ? (
                    <Link href={`https://maps.google.com/?q=${encodeURIComponent(item.location)}`} external>
                      {item.location}
                    </Link>
                  ) : <span style={{ opacity: 0.4 }}>—</span>
                )
              },
              {
                id: "desc",
                header: "Detalles",
                content: (item) => (
                  item.description ? (
                    <Box color="text-body-secondary" style={{ whiteSpace: "pre-line", maxHeight: "100px", overflow: "hidden", textOverflow: "ellipsis" }} dangerouslySetInnerHTML={{ __html: item.description }} />
                  ) : <span style={{ opacity: 0.4 }}>Sin detalles extra</span>
                )
              }
            ]
          }}
          cardsPerRow={[
            { cards: 1 }, 
            { minWidth: 600, cards: 2 }, 
            { minWidth: 900, cards: 3 }
          ]}
        />
      )}
    </SpaceBetween>
  );
}
