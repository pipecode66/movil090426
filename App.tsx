import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  createContenedor,
  createObjeto,
  deleteContenedor,
  deleteObjeto,
  getContenedor,
  initializeDatabase,
  listContenedores,
  listObjetosByContenedor,
  updateContenedor,
  updateObjeto,
} from "./src/data/database";
import type {
  Contenedor,
  ContenedorInput,
  Objeto,
  ObjetoInput,
} from "./src/data/types";

type Screen =
  | { name: "lista" }
  | { name: "formulario-contenedor"; contenedor?: Contenedor }
  | { name: "detalle"; contenedorId: number }
  | { name: "formulario-objeto"; contenedorId: number; objeto?: Objeto };

type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "lista" });
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [contenedorActual, setContenedorActual] = useState<Contenedor | null>(
    null,
  );
  const [objetos, setObjetos] = useState<Objeto[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarContenedores = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      const data = await listContenedores();
      setContenedores(data);
    } catch {
      setError("No se pudieron cargar los contenedores.");
    } finally {
      setBusy(false);
    }
  }, []);

  const cargarDetalle = useCallback(async (contenedorId: number) => {
    setBusy(true);
    setError(null);

    try {
      const [contenedor, objetosEncontrados] = await Promise.all([
        getContenedor(contenedorId),
        listObjetosByContenedor(contenedorId),
      ]);

      setContenedorActual(contenedor);
      setObjetos(objetosEncontrados);
    } catch {
      setError("No se pudo cargar el detalle del contenedor.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const iniciar = async () => {
      try {
        await initializeDatabase();
        await cargarContenedores();
      } catch {
        setError("No se pudo iniciar la base de datos.");
      } finally {
        setInitializing(false);
      }
    };

    void iniciar();
  }, [cargarContenedores]);

  useEffect(() => {
    if (screen.name === "detalle") {
      void cargarDetalle(screen.contenedorId);
    }
  }, [cargarDetalle, screen]);

  const volverALista = async () => {
    setScreen({ name: "lista" });
    await cargarContenedores();
  };

  const guardarContenedor = async (
    input: ContenedorInput,
    contenedorId?: number,
  ) => {
    if (contenedorId) {
      await updateContenedor(contenedorId, input);
    } else {
      await createContenedor(input);
    }

    await volverALista();
  };

  const guardarObjeto = async (
    contenedorId: number,
    input: ObjetoInput,
    objetoId?: number,
  ) => {
    if (objetoId) {
      await updateObjeto(objetoId, input);
    } else {
      await createObjeto(contenedorId, input);
    }

    await cargarDetalle(contenedorId);
    setScreen({ name: "detalle", contenedorId });
  };

  const confirmarEliminarContenedor = (contenedor: Contenedor) => {
    Alert.alert(
      "Eliminar contenedor",
      `Se eliminaran "${contenedor.nombre}" y todos sus objetos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await deleteContenedor(contenedor.id);
              setContenedorActual(null);
              setObjetos([]);
              await volverALista();
            })();
          },
        },
      ],
    );
  };

  const confirmarEliminarObjeto = (objeto: Objeto, contenedorId: number) => {
    Alert.alert("Eliminar objeto", `Se eliminara "${objeto.nombre}".`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await deleteObjeto(objeto.id);
            await cargarDetalle(contenedorId);
          })();
        },
      },
    ]);
  };

  if (initializing) {
    return <LoadingScreen label="Preparando inventario..." />;
  }

  if (screen.name === "formulario-contenedor") {
    return (
      <ContenedorFormScreen
        initial={screen.contenedor}
        onCancel={volverALista}
        onSubmit={guardarContenedor}
      />
    );
  }

  if (screen.name === "formulario-objeto") {
    return (
      <ObjetoFormScreen
        initial={screen.objeto}
        onCancel={() => {
          setScreen({ name: "detalle", contenedorId: screen.contenedorId });
        }}
        onSubmit={(input, objetoId) =>
          guardarObjeto(screen.contenedorId, input, objetoId)
        }
      />
    );
  }

  if (screen.name === "detalle") {
    return (
      <DetalleScreen
        busy={busy}
        contenedor={contenedorActual}
        error={error}
        objetos={objetos}
        onAddObjeto={() =>
          setScreen({
            name: "formulario-objeto",
            contenedorId: screen.contenedorId,
          })
        }
        onBack={volverALista}
        onDeleteContenedor={confirmarEliminarContenedor}
        onDeleteObjeto={(objeto) =>
          confirmarEliminarObjeto(objeto, screen.contenedorId)
        }
        onEditContenedor={(contenedor) =>
          setScreen({ name: "formulario-contenedor", contenedor })
        }
        onEditObjeto={(objeto) =>
          setScreen({
            name: "formulario-objeto",
            contenedorId: screen.contenedorId,
            objeto,
          })
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.kicker}>San Alejo</Text>
        <Text style={styles.title}>Inventario de objetos guardados</Text>
        <Text style={styles.subtitle}>
          Registra cajas, maletas, cajones y todo lo que hay dentro.
        </Text>
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Contenedores</Text>
          <ActionButton
            label="Agregar contenedor"
            onPress={() => setScreen({ name: "formulario-contenedor" })}
          />
        </View>

        {busy ? <Text style={styles.helperText}>Cargando...</Text> : null}

        {contenedores.length === 0 ? (
          <EmptyState label="No hay contenedores. Agrega tu primera caja, maleta o cajon." />
        ) : (
          <View style={styles.list}>
            {contenedores.map((contenedor) => (
              <View key={contenedor.id} style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setScreen({
                      name: "detalle",
                      contenedorId: contenedor.id,
                    })
                  }
                >
                  <Text style={styles.cardTitle}>{contenedor.nombre}</Text>
                  <Text style={styles.cardText}>{contenedor.descripcion}</Text>
                  <Text style={styles.locationText}>{contenedor.ubicacion}</Text>
                </Pressable>

                <View style={styles.cardActions}>
                  <ActionButton
                    label="Ver objetos"
                    onPress={() =>
                      setScreen({
                        name: "detalle",
                        contenedorId: contenedor.id,
                      })
                    }
                    variant="secondary"
                  />
                  <ActionButton
                    label="Editar"
                    onPress={() =>
                      setScreen({
                        name: "formulario-contenedor",
                        contenedor,
                      })
                    }
                    variant="quiet"
                  />
                  <ActionButton
                    label="Eliminar"
                    onPress={() => confirmarEliminarContenedor(contenedor)}
                    variant="danger"
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <SafeAreaView style={[styles.screen, styles.centered]}>
      <StatusBar style="auto" />
      <Text style={styles.kicker}>San Alejo</Text>
      <Text style={styles.helperText}>{label}</Text>
    </SafeAreaView>
  );
}

function DetalleScreen({
  busy,
  contenedor,
  error,
  objetos,
  onAddObjeto,
  onBack,
  onDeleteContenedor,
  onDeleteObjeto,
  onEditContenedor,
  onEditObjeto,
}: {
  busy: boolean;
  contenedor: Contenedor | null;
  error: string | null;
  objetos: Objeto[];
  onAddObjeto: () => void;
  onBack: () => void;
  onDeleteContenedor: (contenedor: Contenedor) => void;
  onDeleteObjeto: (objeto: Objeto) => void;
  onEditContenedor: (contenedor: Contenedor) => void;
  onEditObjeto: (objeto: Objeto) => void;
}) {
  if (!contenedor) {
    return <LoadingScreen label="Cargando detalle..." />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content}>
        <ActionButton label="Volver" onPress={onBack} variant="quiet" />

        <View style={styles.detailHeader}>
          <Text style={styles.kicker}>Detalle</Text>
          <Text style={styles.title}>{contenedor.nombre}</Text>
          <Text style={styles.cardText}>{contenedor.descripcion}</Text>
          <Text style={styles.locationText}>{contenedor.ubicacion}</Text>
        </View>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {busy ? <Text style={styles.helperText}>Cargando...</Text> : null}

        <View style={styles.cardActions}>
          <ActionButton label="Agregar objeto" onPress={onAddObjeto} />
          <ActionButton
            label="Editar contenedor"
            onPress={() => onEditContenedor(contenedor)}
            variant="secondary"
          />
          <ActionButton
            label="Eliminar contenedor"
            onPress={() => onDeleteContenedor(contenedor)}
            variant="danger"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Objetos</Text>
        </View>

        {objetos.length === 0 ? (
          <EmptyState label="Este contenedor esta vacio. Agrega los objetos que hay dentro." />
        ) : (
          <View style={styles.list}>
            {objetos.map((objeto) => (
              <View key={objeto.id} style={styles.card}>
                <Text style={styles.cardTitle}>{objeto.nombre}</Text>
                <Text style={styles.cardText}>{objeto.descripcion}</Text>
                <View style={styles.cardActions}>
                  <ActionButton
                    label="Editar"
                    onPress={() => onEditObjeto(objeto)}
                    variant="secondary"
                  />
                  <ActionButton
                    label="Eliminar"
                    onPress={() => onDeleteObjeto(objeto)}
                    variant="danger"
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContenedorFormScreen({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Contenedor;
  onCancel: () => void;
  onSubmit: (input: ContenedorInput, contenedorId?: number) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? "");
  const [ubicacion, setUbicacion] = useState(initial?.ubicacion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    const input = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      ubicacion: ubicacion.trim(),
    };

    if (!input.nombre || !input.descripcion || !input.ubicacion) {
      setError("Completa nombre, descripcion y ubicacion.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(input, initial?.id);
    } catch {
      setError("No se pudo guardar el contenedor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormShell title={initial ? "Editar contenedor" : "Agregar contenedor"}>
      <TextField label="Nombre" value={nombre} onChangeText={setNombre} />
      <TextField
        label="Descripcion"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />
      <TextField
        label="Ubicacion"
        value={ubicacion}
        onChangeText={setUbicacion}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.formActions}>
        <ActionButton label="Cancelar" onPress={onCancel} variant="secondary" />
        <ActionButton
          label={saving ? "Guardando..." : "Guardar"}
          onPress={guardar}
          disabled={saving}
        />
      </View>
    </FormShell>
  );
}

function ObjetoFormScreen({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Objeto;
  onCancel: () => void;
  onSubmit: (input: ObjetoInput, objetoId?: number) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    const input = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
    };

    if (!input.nombre || !input.descripcion) {
      setError("Completa nombre y descripcion.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(input, initial?.id);
    } catch {
      setError("No se pudo guardar el objeto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormShell title={initial ? "Editar objeto" : "Agregar objeto"}>
      <TextField label="Nombre" value={nombre} onChangeText={setNombre} />
      <TextField
        label="Descripcion"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.formActions}>
        <ActionButton label="Cancelar" onPress={onCancel} variant="secondary" />
        <ActionButton
          label={saving ? "Guardando..." : "Guardar"}
          onPress={guardar}
          disabled={saving}
        />
      </View>
    </FormShell>
  );
}

function FormShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.detailHeader}>
            <Text style={styles.kicker}>Registro</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TextField({
  label,
  multiline,
  onChangeText,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#7A8678"
        style={[styles.input, multiline ? styles.multilineInput : null]}
        value={value}
      />
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
  variant = "primary",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}) {
  const variantStyle =
    variant === "danger"
      ? styles.buttonDanger
      : variant === "secondary"
        ? styles.buttonSecondary
        : variant === "quiet"
          ? styles.buttonQuiet
          : styles.buttonPrimary;
  const textStyle =
    variant === "primary" ? styles.buttonTextLight : styles.buttonTextDark;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        pressed ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text style={[styles.buttonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F6EF",
  },
  flex: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: "#F7F6EF",
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 16,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 44,
  },
  kicker: {
    color: "#1F7A5C",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#243128",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 34,
    marginTop: 6,
  },
  subtitle: {
    color: "#516055",
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  sectionHeader: {
    alignItems: "flex-start",
    gap: 12,
  },
  sectionTitle: {
    color: "#243128",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE2D8",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardTitle: {
    color: "#243128",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0,
  },
  cardText: {
    color: "#4B5B51",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },
  locationText: {
    color: "#8B3F47",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },
  cardActions: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailHeader: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE2D8",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 18,
  },
  emptyState: {
    backgroundColor: "#FFF8E1",
    borderColor: "#E5BE52",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  emptyText: {
    color: "#5E4B17",
    fontSize: 15,
    lineHeight: 21,
  },
  helperText: {
    color: "#516055",
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: "#FBE8EA",
    color: "#8B2635",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 20,
    padding: 12,
  },
  errorText: {
    color: "#8B2635",
    fontSize: 14,
    fontWeight: "700",
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#243128",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BFC8B8",
    borderRadius: 8,
    borderWidth: 1,
    color: "#243128",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  formActions: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    borderRadius: 8,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonPrimary: {
    backgroundColor: "#1F7A5C",
  },
  buttonSecondary: {
    backgroundColor: "#E6EFE4",
    borderColor: "#BFD1BE",
    borderWidth: 1,
  },
  buttonDanger: {
    backgroundColor: "#FBE8EA",
    borderColor: "#E8A8B0",
    borderWidth: 1,
  },
  buttonQuiet: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE2D8",
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  buttonTextLight: {
    color: "#FFFFFF",
  },
  buttonTextDark: {
    color: "#243128",
  },
});
