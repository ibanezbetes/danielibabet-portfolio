"use client";

/**
 * TAREAS PENDIENTES — CRUD sobre DynamoDB
 * Tabla "agenda-tasks" — Partition Key: taskId (String)
 */

import React, { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoDBClient } from "@/lib/dynamodb-client";
import { TABLES } from "@/lib/aws-config";
import { useAgendaAuth } from "@/context/AgendaAuthContext";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import Textarea from "@cloudscape-design/components/textarea";
import Badge from "@cloudscape-design/components/badge";

interface Task {
  taskId: string;
  title: string;
  notes: string;
  priority: string;
  done: boolean;
  createdAt: string;
}

const PRIORITIES = [
  { label: "Alta", value: "Alta" },
  { label: "Media", value: "Media" },
  { label: "Baja", value: "Baja" },
];

const PRIORITY_COLOR: Record<string, "red" | "blue" | "green"> = {
  Alta: "red",
  Media: "blue",
  Baja: "green",
};

export default function TasksPage() {
  const { tokens } = useAgendaAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPriority, setNewPriority] = useState(PRIORITIES[1]);
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState<Task[]>([]);
  const [deleting, setDeleting] = useState(false);

  const getClient = useCallback(() => {
    if (!tokens?.idToken) throw new Error("No autenticado");
    return createDynamoDBClient(tokens.idToken);
  }, [tokens]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getClient();
      const result = await client.send(new ScanCommand({ TableName: TABLES.TASKS }));
      const rows = (result.Items ?? []) as Task[];
      rows.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const order: Record<string, number> = { Alta: 0, Media: 1, Baja: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      });
      setTasks(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tareas.");
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  useEffect(() => { void fetchTasks(); }, [fetchTasks]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const client = getClient();
      const task: Task = {
        taskId: uuidv4(),
        title: newTitle.trim(),
        notes: newNotes.trim(),
        priority: newPriority.value,
        done: false,
        createdAt: new Date().toISOString(),
      };
      await client.send(new PutCommand({ TableName: TABLES.TASKS, Item: task }));
      setNewTitle(""); setNewNotes("");
      setNewPriority(PRIORITIES[1]);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear tarea.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(task: Task) {
    try {
      const client = getClient();
      await client.send(new PutCommand({ TableName: TABLES.TASKS, Item: { ...task, done: !task.done } }));
      setTasks((prev) => prev.map((t) => t.taskId === task.taskId ? { ...t, done: !t.done } : t));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar.");
    }
  }

  async function handleDeleteSelected() {
    setDeleting(true);
    try {
      const client = getClient();
      await Promise.all(selected.map((t) =>
        client.send(new DeleteCommand({ TableName: TABLES.TASKS, Key: { taskId: t.taskId } }))
      ));
      setSelected([]);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  const pending = tasks.filter((t) => !t.done).length;

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description={`${pending} tareas pendientes · ${tasks.length - pending} completadas`}>
        Tareas Pendientes
      </Header>

      {error && <Alert type="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

      <Container header={<Header variant="h2">Nueva tarea</Header>}>
        <form onSubmit={handleAdd}>
          <Form actions={<Button variant="primary" formAction="submit" loading={submitting} iconName="add-plus">Añadir tarea</Button>}>
            <SpaceBetween size="m">
              <SpaceBetween direction="horizontal" size="m">
                <FormField label="Tarea" controlId="task-title" stretch>
                  <Input id="task-title" value={newTitle} onChange={(e) => setNewTitle(e.detail.value)}
                    placeholder="Ej. Llamar al médico" disabled={submitting} />
                </FormField>
                <FormField label="Prioridad" controlId="task-priority">
                  <Select selectedOption={newPriority} onChange={(e) => setNewPriority(e.detail.selectedOption as typeof PRIORITIES[0])}
                    options={PRIORITIES} disabled={submitting} />
                </FormField>
              </SpaceBetween>
              <FormField label="Notas (opcional)" controlId="task-notes">
                <Textarea id="task-notes" value={newNotes} onChange={(e) => setNewNotes(e.detail.value)}
                  placeholder="Detalles adicionales..." rows={2} disabled={submitting} />
              </FormField>
            </SpaceBetween>
          </Form>
        </form>
      </Container>

      <Table
        items={tasks}
        loading={loading}
        loadingText="Cargando tareas..."
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={(e) => setSelected(e.detail.selectedItems)}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xl">
            <b>¡Sin tareas pendientes!</b>
            <Box variant="p">Añade tu primera tarea arriba.</Box>
          </Box>
        }
        header={
          <Header variant="h2" counter={`(${tasks.length})`}
            actions={<Button iconName="remove" disabled={!selected.length} loading={deleting} onClick={handleDeleteSelected}>
              Eliminar ({selected.length})
            </Button>}>
            Tareas
          </Header>
        }
        columnDefinitions={[
          {
            id: "done", header: "✓", width: 60,
            cell: (item) => <Checkbox checked={item.done} onChange={() => handleToggle(item)} />,
          },
          {
            id: "title", header: "Tarea", sortingField: "title",
            cell: (item) => (
              <span style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>
                {item.title}
              </span>
            ),
          },
          {
            id: "priority", header: "Prioridad", sortingField: "priority", width: 120,
            cell: (item) => <Badge color={PRIORITY_COLOR[item.priority] ?? "blue"}>{item.priority}</Badge>,
          },
          {
            id: "notes", header: "Notas",
            cell: (item) => item.notes || <span style={{ opacity: 0.4 }}>—</span>,
          },
          {
            id: "date", header: "Creada", width: 110,
            cell: (item) => new Date(item.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
          },
        ]}
      />
    </SpaceBetween>
  );
}
