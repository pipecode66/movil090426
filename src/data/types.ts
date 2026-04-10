export type Contenedor = {
  id: number;
  nombre: string;
  descripcion: string;
  ubicacion: string;
};

export type Objeto = {
  id: number;
  nombre: string;
  descripcion: string;
  id_contenedor: number;
};

export type ContenedorInput = Omit<Contenedor, "id">;

export type ObjetoInput = Pick<Objeto, "nombre" | "descripcion">;
