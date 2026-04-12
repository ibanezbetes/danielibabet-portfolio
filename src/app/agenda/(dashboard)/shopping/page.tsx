"use client";

/**
 * LISTA DE LA COMPRA — Sección completa con CRUD sobre DynamoDB
 *
 * Operaciones:
 *  - ScanCommand   → listar todos los items
 *  - PutCommand    → añadir nuevo item
 *  - DeleteCommand → eliminar item por itemId
 *
 * La tabla DynamoDB "agenda-shopping" tiene Partition Key: itemId (String)
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
import TextFilter from "@cloudscape-design/components/text-filter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShoppingItem {
  itemId: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { label: "Alimentación", value: "Alimentación" },
  { label: "Limpieza", value: "Limpieza" },
  { label: "Higiene", value: "Higiene" },
  { label: "Bebidas", value: "Bebidas" },
  { label: "Otros", value: "Otros" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const { tokens } = useAgendaAuth();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  // Form state
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);

  // Selected rows for bulk delete
  const [selected, setSelected] = useState<ShoppingItem[]>([]);
  const [deleting, setDeleting] = useState(false);

  // ── DynamoDB helpers ─────────────────────────────────────────────────────

  const getClient = useCallback(() => {
    if (!tokens?.idToken) throw new Error("No autenticado");
    return createDynamoDBClient(tokens.idToken);
  }, [tokens]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getClient();
      const result = await client.send(
        new ScanCommand({ TableName: TABLES.SHOPPING })
      );
      const rows = (result.Items ?? []) as ShoppingItem[];
      // Sort: unchecked first, then by creation date
      rows.sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        return a.createdAt.localeCompare(b.createdAt);
      });
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la lista.");
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // ── Add item ─────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const client = getClient();
      const item: ShoppingItem = {
        itemId: uuidv4(),
        name: newName.trim(),
        quantity: newQuantity.trim() || "1",
        category: newCategory.value,
        checked: false,
        createdAt: new Date().toISOString(),
      };
      await client.send(
        new PutCommand({ TableName: TABLES.SHOPPING, Item: item })
      );
      setNewName("");
      setNewQuantity("1");
      setNewCategory(CATEGORIES[0]);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al añadir el item.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Toggle checked ────────────────────────────────────────────────────────

  async function handleToggle(item: ShoppingItem) {
    try {
      const client = getClient();
      await client.send(
        new PutCommand({
          TableName: TABLES.SHOPPING,
          Item: { ...item, checked: !item.checked },
        })
      );
      setItems((prev) =>
        prev.map((i) =>
          i.itemId === item.itemId ? { ...i, checked: !i.checked } : i
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar.");
    }
  }

  // ── Delete selected ───────────────────────────────────────────────────────

  async function handleDeleteSelected() {
    if (!selected.length) return;
    setDeleting(true);
    setError(null);
    try {
      const client = getClient();
      await Promise.all(
        selected.map((item) =>
          client.send(
            new DeleteCommand({
              TableName: TABLES.SHOPPING,
              Key: { itemId: item.itemId },
            })
          )
        )
      );
      setSelected([]);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(filterText.toLowerCase()) ||
    i.category.toLowerCase().includes(filterText.toLowerCase())
  );

  const checkedCount = items.filter((i) => i.checked).length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description={`${items.length} items · ${checkedCount} comprados`}
        actions={
          <Button
            iconName="refresh"
            onClick={fetchItems}
            loading={loading}
          >
            Actualizar
          </Button>
        }
      >
        Lista de la Compra
      </Header>

      {error && (
        <Alert type="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Add form ── */}
      <Container header={<Header variant="h2">Añadir producto</Header>}>
        <form onSubmit={handleAdd}>
          <Form
            actions={
              <Button
                variant="primary"
                formAction="submit"
                loading={submitting}
                iconName="add-plus"
              >
                Añadir
              </Button>
            }
          >
            <SpaceBetween direction="horizontal" size="m">
              <FormField label="Producto" controlId="shop-name" stretch>
                <Input
                  id="shop-name"
                  value={newName}
                  onChange={(e) => setNewName(e.detail.value)}
                  placeholder="Ej. Leche entera"
                  disabled={submitting}
                />
              </FormField>
              <FormField label="Cantidad" controlId="shop-qty">
                <Input
                  id="shop-qty"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.detail.value)}
                  placeholder="1"
                  disabled={submitting}
                  inputMode="numeric"
                />
              </FormField>
              <FormField label="Categoría" controlId="shop-category">
                <Select
                  selectedOption={newCategory}
                  onChange={(e) => setNewCategory(e.detail.selectedOption as typeof CATEGORIES[0])}
                  options={CATEGORIES}
                  disabled={submitting}
                />
              </FormField>
            </SpaceBetween>
          </Form>
        </form>
      </Container>

      {/* ── Table ── */}
      <Table
        items={filteredItems}
        loading={loading}
        loadingText="Cargando lista..."
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xl">
            <b>Lista vacía</b>
            <Box padding={{ bottom: "s" }} variant="p">
              Añade tu primer producto usando el formulario de arriba.
            </Box>
          </Box>
        }
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={(e) => setSelected(e.detail.selectedItems)}
        header={
          <Header
            variant="h2"
            counter={`(${filteredItems.length})`}
            actions={
              <Button
                variant="normal"
                iconName="remove"
                disabled={!selected.length}
                loading={deleting}
                onClick={handleDeleteSelected}
              >
                Eliminar seleccionados ({selected.length})
              </Button>
            }
          >
            Productos
          </Header>
        }
        filter={
          <TextFilter
            filteringText={filterText}
            filteringPlaceholder="Buscar producto o categoría..."
            onChange={(e) => setFilterText(e.detail.filteringText)}
          />
        }
        columnDefinitions={[
          {
            id: "checked",
            header: "✓",
            width: 60,
            cell: (item) => (
              <Checkbox
                checked={item.checked}
                onChange={() => handleToggle(item)}
              />
            ),
          },
          {
            id: "name",
            header: "Producto",
            sortingField: "name",
            cell: (item) => (
              <span
                style={{
                  textDecoration: item.checked ? "line-through" : "none",
                  opacity: item.checked ? 0.5 : 1,
                }}
              >
                {item.name}
              </span>
            ),
          },
          {
            id: "quantity",
            header: "Cantidad",
            width: 100,
            cell: (item) => item.quantity,
          },
          {
            id: "category",
            header: "Categoría",
            sortingField: "category",
            cell: (item) => item.category,
          },
          {
            id: "date",
            header: "Añadido",
            cell: (item) =>
              new Date(item.createdAt).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
              }),
          },
        ]}
        sortingDisabled={false}
      />
    </SpaceBetween>
  );
}
