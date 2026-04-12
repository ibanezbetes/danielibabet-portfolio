"use client";

/**
 * LINKS Y NOTICIAS — Repositorio de enlaces por categorías
 * Tabla "agenda-links" — Partition Key: linkId (String)
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
import Container from "@cloudscape-design/components/container";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Link from "@cloudscape-design/components/link";

interface SavedLink {
  linkId: string;
  title: string;
  url: string;
  description: string;
  category: string;
  createdAt: string;
}

const LINK_CATEGORIES = [
  { label: "Trabajo", value: "Trabajo" },
  { label: "Herramientas Dev", value: "Herramientas Dev" },
  { label: "Noticias", value: "Noticias" },
  { label: "Aprendizaje", value: "Aprendizaje" },
  { label: "Diseño", value: "Diseño" },
  { label: "AWS/Cloud", value: "AWS/Cloud" },
  { label: "Ocio", value: "Ocio" },
  { label: "Otros", value: "Otros" },
];

export default function LinksPage() {
  const { tokens } = useAgendaAuth();

  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState(LINK_CATEGORIES[0]);

  const getClient = useCallback(() => {
    if (!tokens?.idToken) throw new Error("No autenticado");
    return createDynamoDBClient(tokens.idToken);
  }, [tokens]);

  const fetchLinks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const client = getClient();
      const result = await client.send(new ScanCommand({ TableName: TABLES.LINKS }));
      const rows = (result.Items ?? []) as SavedLink[];
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setLinks(rows);
    } catch (err) { setError(err instanceof Error ? err.message : "Error al cargar links."); }
    finally { setLoading(false); }
  }, [getClient]);

  useEffect(() => { void fetchLinks(); }, [fetchLinks]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    setSubmitting(true);
    try {
      const client = getClient();
      const link: SavedLink = {
        linkId: uuidv4(),
        title: newTitle.trim(),
        url: newUrl.trim().startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`,
        description: newDesc.trim(),
        category: newCat.value,
        createdAt: new Date().toISOString(),
      };
      await client.send(new PutCommand({ TableName: TABLES.LINKS, Item: link }));
      setNewTitle(""); setNewUrl(""); setNewDesc("");
      setNewCat(LINK_CATEGORIES[0]);
      await fetchLinks();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al guardar link."); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(linkId: string) {
    try {
      const client = getClient();
      await client.send(new DeleteCommand({ TableName: TABLES.LINKS, Key: { linkId } }));
      setLinks((prev) => prev.filter((l) => l.linkId !== linkId));
    } catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar."); }
  }

  // Group links by category
  const groupedLinks = LINK_CATEGORIES.map(({ value, label }) => ({
    category: value,
    label,
    items: links.filter((l) => l.category === value),
  })).filter((g) => g.items.length > 0);

  const otherLinks = links.filter(
    (l) => !LINK_CATEGORIES.some((c) => c.value === l.category)
  );

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description={`${links.length} enlaces guardados`}
        actions={<Button iconName="refresh" onClick={fetchLinks} loading={loading}>Actualizar</Button>}>
        Links y Noticias
      </Header>

      {error && <Alert type="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

      {/* ── Add form ── */}
      <Container header={<Header variant="h2">Guardar nuevo enlace</Header>}>
        <form onSubmit={handleAdd}>
          <Form actions={<Button variant="primary" formAction="submit" loading={submitting} iconName="add-plus">Guardar</Button>}>
            <SpaceBetween size="m">
              <SpaceBetween direction="horizontal" size="m">
                <FormField label="Título" controlId="link-title" stretch>
                  <Input id="link-title" value={newTitle} onChange={(e) => setNewTitle(e.detail.value)}
                    placeholder="Ej. AWS Architecture Blog" disabled={submitting} />
                </FormField>
                <FormField label="URL" controlId="link-url" stretch>
                  <Input id="link-url" value={newUrl} onChange={(e) => setNewUrl(e.detail.value)}
                    placeholder="https://..." type="url" disabled={submitting} />
                </FormField>
                <FormField label="Categoría" controlId="link-cat">
                  <Select selectedOption={newCat} onChange={(e) => setNewCat(e.detail.selectedOption as typeof LINK_CATEGORIES[0])}
                    options={LINK_CATEGORIES} disabled={submitting} />
                </FormField>
              </SpaceBetween>
              <FormField label="Descripción (opcional)" controlId="link-desc">
                <Textarea id="link-desc" value={newDesc} onChange={(e) => setNewDesc(e.detail.value)}
                  placeholder="¿Para qué sirve este enlace?" rows={2} disabled={submitting} />
              </FormField>
            </SpaceBetween>
          </Form>
        </form>
      </Container>

      {/* ── Grouped links ── */}
      {loading ? (
        <Box color="text-body-secondary" textAlign="center" padding="xl">Cargando enlaces...</Box>
      ) : links.length === 0 ? (
        <Box color="text-body-secondary" textAlign="center" padding="xl">
          <b>Sin enlaces guardados.</b><Box variant="p">Guarda tu primer enlace usando el formulario de arriba.</Box>
        </Box>
      ) : (
        <SpaceBetween size="m">
          {[...groupedLinks, ...(otherLinks.length ? [{ label: "Otros", category: "Otros", items: otherLinks }] : [])].map((group) => (
            <ExpandableSection
              key={group.category}
              defaultExpanded
              headerText={`${group.label} (${group.items.length})`}
              variant="container"
            >
              <SpaceBetween size="s">
                {group.items.map((link) => (
                  <div
                    key={link.linkId}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={link.url} external>
                        {link.title}
                      </Link>
                      {link.description && (
                        <Box color="text-body-secondary" fontSize="body-s">
                          {link.description}
                        </Box>
                      )}
                      <Box color="text-body-secondary" fontSize="body-s">
                        {new URL(link.url).hostname} ·{" "}
                        {new Date(link.createdAt).toLocaleDateString("es-ES")}
                      </Box>
                    </div>
                    <Button iconName="remove" variant="icon" onClick={() => handleDelete(link.linkId)}
                      ariaLabel={`Eliminar ${link.title}`} />
                  </div>
                ))}
              </SpaceBetween>
            </ExpandableSection>
          ))}
        </SpaceBetween>
      )}
    </SpaceBetween>
  );
}
