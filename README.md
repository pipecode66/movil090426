# SanAlejo

Aplicacion movil para registrar contenedores de casa y los objetos guardados en cada uno. Funciona offline con SQLite local.

## Tecnologia usada

- Expo React Native
- TypeScript
- SQLite local con `expo-sqlite`

## Funciones

- Lista de contenedores con nombre, descripcion y ubicacion.
- Formulario para crear y editar contenedores.
- Detalle de cada contenedor con sus objetos guardados.
- Formulario para crear y editar objetos asociados al contenedor seleccionado.
- Eliminacion de objetos y contenedores con confirmacion.
- Eliminacion en cascada de objetos al borrar un contenedor.
- Validacion de campos vacios antes de guardar.
- Datos iniciales del taller cargados en SQLite.

## Como ejecutar

1. Instalar dependencias:

```bash
npm install
```

2. Iniciar Expo:

```bash
npm run start
```

El proyecto inicia en modo offline para evitar validaciones remotas de Expo que no son necesarias para este taller.

3. Abrir la app con Expo Go en el celular o ejecutar en un emulador:

```bash
npm run android
```

## Validacion

```bash
npm run typecheck
```

## Datos de prueba

Al iniciar por primera vez, la app carga:

- Caja cocina
- Maleta ropa invierno
- Cajon cables

Cada contenedor incluye los objetos indicados en el taller.
