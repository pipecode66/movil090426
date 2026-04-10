import * as SQLite from "expo-sqlite";

import type { Contenedor, ContenedorInput, Objeto, ObjetoInput } from "./types";

const DATABASE_NAME = "sanalejo.db";
const SEED_KEY = "seeded_v1";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const seedData: Array<ContenedorInput & { objetos: ObjetoInput[] }> = [
  {
    nombre: "Caja cocina",
    descripcion: "Electrodomésticos y utensilios que no uso seguido",
    ubicacion: "Alacena superior cocina",
    objetos: [
      {
        nombre: "Waflera",
        descripcion: "Waflera eléctrica marca Oster, funciona bien",
      },
      {
        nombre: "Moldes navideños",
        descripcion: "Moldes de galletas en forma de estrella y árbol",
      },
      {
        nombre: "Exprimidor",
        descripcion: "Exprimidor de naranjas manual, color verde",
      },
    ],
  },
  {
    nombre: "Maleta ropa invierno",
    descripcion: "Ropa de clima frío que solo uso en viajes",
    ubicacion: "Closet cuarto principal, parte de arriba",
    objetos: [
      {
        nombre: "Chaqueta negra",
        descripcion: "Chaqueta North Face talla M",
      },
      {
        nombre: "Bufanda gris",
        descripcion: "Bufanda de lana tejida",
      },
      {
        nombre: "Guantes",
        descripcion: "Guantes térmicos negros",
      },
      {
        nombre: "Gorro de lana",
        descripcion: "Gorro azul oscuro con pompón",
      },
    ],
  },
  {
    nombre: "Cajón cables",
    descripcion: "Cables, cargadores y adaptadores varios",
    ubicacion: "Escritorio, segundo cajón",
    objetos: [
      {
        nombre: "Cable HDMI",
        descripcion: "Cable HDMI 2 metros, negro",
      },
      {
        nombre: "Cargador Samsung viejo",
        descripcion: "Cargador micro USB, funciona",
      },
      {
        nombre: "Adaptador USB-C",
        descripcion: "Adaptador USB-C a USB-A",
      },
    ],
  },
];

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = openAndPrepareDatabase();
  }

  return databasePromise;
}

async function openAndPrepareDatabase() {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS contenedor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      ubicacion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS objeto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      id_contenedor INTEGER NOT NULL,
      FOREIGN KEY (id_contenedor) REFERENCES contenedor(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  await seedInitialData(database);

  return database;
}

async function seedInitialData(database: SQLite.SQLiteDatabase) {
  const seeded = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [SEED_KEY],
  );

  if (seeded) {
    return;
  }

  await database.withTransactionAsync(async () => {
    for (const contenedor of seedData) {
      const result = await database.runAsync(
        "INSERT INTO contenedor (nombre, descripcion, ubicacion) VALUES (?, ?, ?)",
        [contenedor.nombre, contenedor.descripcion, contenedor.ubicacion],
      );

      for (const objeto of contenedor.objetos) {
        await database.runAsync(
          "INSERT INTO objeto (nombre, descripcion, id_contenedor) VALUES (?, ?, ?)",
          [objeto.nombre, objeto.descripcion, result.lastInsertRowId],
        );
      }
    }

    await database.runAsync(
      "INSERT INTO app_meta (key, value) VALUES (?, ?)",
      [SEED_KEY, "true"],
    );
  });
}

export async function initializeDatabase() {
  await getDatabase();
}

export async function listContenedores() {
  const database = await getDatabase();

  return database.getAllAsync<Contenedor>(
    "SELECT id, nombre, descripcion, ubicacion FROM contenedor ORDER BY nombre COLLATE NOCASE",
  );
}

export async function getContenedor(id: number) {
  const database = await getDatabase();

  return database.getFirstAsync<Contenedor>(
    "SELECT id, nombre, descripcion, ubicacion FROM contenedor WHERE id = ?",
    [id],
  );
}

export async function createContenedor(input: ContenedorInput) {
  const database = await getDatabase();
  const result = await database.runAsync(
    "INSERT INTO contenedor (nombre, descripcion, ubicacion) VALUES (?, ?, ?)",
    [input.nombre, input.descripcion, input.ubicacion],
  );

  return result.lastInsertRowId;
}

export async function updateContenedor(id: number, input: ContenedorInput) {
  const database = await getDatabase();

  await database.runAsync(
    "UPDATE contenedor SET nombre = ?, descripcion = ?, ubicacion = ? WHERE id = ?",
    [input.nombre, input.descripcion, input.ubicacion, id],
  );
}

export async function deleteContenedor(id: number) {
  const database = await getDatabase();

  await database.runAsync("DELETE FROM contenedor WHERE id = ?", [id]);
}

export async function listObjetosByContenedor(idContenedor: number) {
  const database = await getDatabase();

  return database.getAllAsync<Objeto>(
    "SELECT id, nombre, descripcion, id_contenedor FROM objeto WHERE id_contenedor = ? ORDER BY nombre COLLATE NOCASE",
    [idContenedor],
  );
}

export async function createObjeto(idContenedor: number, input: ObjetoInput) {
  const database = await getDatabase();
  const result = await database.runAsync(
    "INSERT INTO objeto (nombre, descripcion, id_contenedor) VALUES (?, ?, ?)",
    [input.nombre, input.descripcion, idContenedor],
  );

  return result.lastInsertRowId;
}

export async function updateObjeto(id: number, input: ObjetoInput) {
  const database = await getDatabase();

  await database.runAsync(
    "UPDATE objeto SET nombre = ?, descripcion = ? WHERE id = ?",
    [input.nombre, input.descripcion, id],
  );
}

export async function deleteObjeto(id: number) {
  const database = await getDatabase();

  await database.runAsync("DELETE FROM objeto WHERE id = ?", [id]);
}
