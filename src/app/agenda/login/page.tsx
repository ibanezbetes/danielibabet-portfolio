"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import { useAgendaAuth } from "@/context/AgendaAuthContext";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAgendaAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/agenda/shopping";

  // Apply Cloudscape dark mode on client only
  useEffect(() => {
    applyMode(Mode.Dark);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push(from);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error de autenticación.";
      if (message.includes("Incorrect username or password")) {
        setError("Email o contraseña incorrectos.");
      } else if (message.includes("User does not exist")) {
        setError("No existe un usuario con ese email.");
      } else if (message.includes("Password reset required")) {
        setError("Debes restablecer tu contraseña desde la consola de AWS.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f1b2d",
        backgroundImage:
          "radial-gradient(ellipse at 20% 50%, rgba(0, 119, 204, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0, 119, 204, 0.05) 0%, transparent 50%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px" }}>
        {/* Logo / Title */}
        <Box textAlign="center" margin={{ bottom: "xl" }}>
          <Box fontSize="heading-xl" color="text-label" fontWeight="bold">
            Acceso privado
          </Box>
        </Box>

        <Container>
          <form onSubmit={handleSubmit}>
            <Form
              actions={
                <Button
                  variant="primary"
                  formAction="submit"
                  loading={loading}
                  fullWidth
                >
                  {loading ? "Iniciando sesión..." : "Entrar"}
                </Button>
              }
              header={<Header variant="h2">Iniciar sesión</Header>}
              errorText={error}
            >
              <SpaceBetween size="m">
                {error && (
                  <Alert type="error" dismissible onDismiss={() => setError(null)}>
                    {error}
                  </Alert>
                )}
                <FormField label="Email" controlId="login-email">
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.detail.value)}
                    placeholder="email"
                    autoFocus
                    disabled={loading}
                  />
                </FormField>
                <FormField label="Contraseña" controlId="login-password">
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.detail.value)}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </FormField>
              </SpaceBetween>
            </Form>
          </form>
        </Container>
      </div>
    </div>
  );
}
