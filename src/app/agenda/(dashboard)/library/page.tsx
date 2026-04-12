"use client";

/**
 * BIBLIOTECA DE OCIO — Series, Películas, Videojuegos
 * Tabla "agenda-library" — Partition Key: entryId (String)
 */

import React, { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoDBClient } from "@/lib/dynamodb-client";
import { TABLES } from "@/lib/aws-config";
import { useAgendaAuth } from "@/context/AgendaAuthContext";

import Alert from "@cloudscape-design/components/alert";
import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Cards from "@cloudscape-design/components/cards";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";

interface LibraryEntry {
  entryId: string;
  title: string;
  type: string;
  status: string;
  rating: string;
  notes: string;
  createdAt: string;
}

const TYPES = [
  { label: "Serie", value: "Serie" },
  { label: "Película", value: "Película" },
  { label: "Videojuego", value: "Videojuego" },
  { label: "Libro", value: "Libro" },
];

const STATUSES = [
  { label: "Pendiente", value: "Pendiente" },
  { label: "En curso", value: "En curso" },
  { label: "Completado", value: "Completado" },
  { label: "En pausa", value: "En pausa" },
  { label: "Abandonado", value: "Abandonado" },
];

const STATUS_COLOR: Record<string, "blue" | "green" | "grey" | "red"> = {
  "Pendiente": "grey",
  "En curso": "blue",
  "Completado": "green",
  "En pausa": "grey",
  "Abandonado": "red",
};


export default function LibraryPage() {
  const { tokens } = useAgendaAuth();

  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState(TYPES[0]);
  const [newStatus, setNewStatus] = useState(STATUSES[0]);
  const [newRating, setNewRating] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const getClient = useCallback(() => {
    if (!tokens?.idToken) throw new Error("No autenticado");
    return createDynamoDBClient(tokens.idToken);
  }, [tokens]);

  const fetchEntries = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const client = getClient();
      const result = await client.send(new ScanCommand({ TableName: TABLES.LIBRARY }));
      const rows = (result.Items ?? []) as LibraryEntry[];
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setEntries(rows);
    } catch (err) { setError(err instanceof Error ? err.message : "Error al cargar."); }
    finally { setLoading(false); }
  }, [getClient]);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const client = getClient();
      const entry: LibraryEntry = {
        entryId: uuidv4(),
        title: newTitle.trim(),
        type: newType.value,
        status: newStatus.value,
        rating: newRating.trim(),
        notes: newNotes.trim(),
        createdAt: new Date().toISOString(),
      };
      await client.send(new PutCommand({ TableName: TABLES.LIBRARY, Item: entry }));
      setNewTitle(""); setNewType(TYPES[0]); setNewStatus(STATUSES[0]);
      setNewRating(""); setNewNotes("");
      setModalOpen(false);
      await fetchEntries();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al añadir."); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(entryId: string) {
    try {
      const client = getClient();
      await client.send(new DeleteCommand({ TableName: TABLES.LIBRARY, Key: { entryId } }));
      setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
    } catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar."); }
  }

  const byType = (type: string) => entries.filter((e) => e.type === type);

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description={`${entries.length} entradas · ${byType("Serie").length} series · ${byType("Película").length} películas · ${byType("Videojuego").length} juegos`}
        actions={
          <SpaceBetween direction="horizontal" size="s">
            <Button iconName="refresh" onClick={fetchEntries} loading={loading}>Actualizar</Button>
            <Button variant="primary" iconName="add-plus" onClick={() => setModalOpen(true)}>Añadir</Button>
          </SpaceBetween>
        }>
        Biblioteca de Ocio
      </Header>

      {error && <Alert type="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

      <Cards
        items={entries}
        loading={loading}
        loadingText="Cargando biblioteca..."
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xl">
            <b>Biblioteca vacía</b>
            <Box variant="p">Añade tu primera entrada con el botón de arriba.</Box>
          </Box>
        }
        cardDefinition={{
          header: (item) => (
              <span>{item.title}</span>
          ),
          sections: [
            {
              id: "status",
              content: (item) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Badge color={STATUS_COLOR[item.status] ?? "grey"}>{item.status}</Badge>
                  {item.rating && <span>{item.rating}/10</span>}
                </SpaceBetween>
              ),
            },
            {
              id: "type",
              header: "Tipo",
              content: (item) => item.type,
            },
            {
              id: "notes",
              header: "Notas",
              content: (item) => item.notes || <span style={{ opacity: 0.4 }}>Sin notas</span>,
            },
            {
              id: "actions",
              content: (item) => (
                <Button iconName="remove" variant="link" onClick={() => handleDelete(item.entryId)}>
                  Eliminar
                </Button>
              ),
            },
          ],
        }}
        cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 2 }, { minWidth: 900, cards: 3 }]}
      />

      {/* Add modal */}
      <Modal
        visible={modalOpen}
        onDismiss={() => setModalOpen(false)}
        header={<Header variant="h2">Añadir a la biblioteca</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={submitting} onClick={(e) => handleAdd(e as unknown as React.FormEvent)}>Añadir</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <form onSubmit={handleAdd}>
          <Form>
            <SpaceBetween size="m">
              <FormField label="Título" controlId="lib-title">
                <Input id="lib-title" value={newTitle} onChange={(e) => setNewTitle(e.detail.value)}
                  placeholder="Ej. Breaking Bad" disabled={submitting} />
              </FormField>
              <SpaceBetween direction="horizontal" size="m">
                <FormField label="Tipo" controlId="lib-type">
                  <Select selectedOption={newType} onChange={(e) => setNewType(e.detail.selectedOption as typeof TYPES[0])}
                    options={TYPES} disabled={submitting} />
                </FormField>
                <FormField label="Estado" controlId="lib-status">
                  <Select selectedOption={newStatus} onChange={(e) => setNewStatus(e.detail.selectedOption as typeof STATUSES[0])}
                    options={STATUSES} disabled={submitting} />
                </FormField>
                <FormField label="Nota /10" controlId="lib-rating">
                  <Input id="lib-rating" value={newRating} onChange={(e) => setNewRating(e.detail.value)}
                    placeholder="8" inputMode="numeric" disabled={submitting} />
                </FormField>
              </SpaceBetween>
              <FormField label="Notas (opcional)" controlId="lib-notes">
                <Textarea id="lib-notes" value={newNotes} onChange={(e) => setNewNotes(e.detail.value)}
                  placeholder="¿Qué te pareció?" rows={3} disabled={submitting} />
              </FormField>
            </SpaceBetween>
          </Form>
        </form>
      </Modal>
    </SpaceBetween>
  );
}
