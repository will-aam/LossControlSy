import { Item, CategoriaData, User, Evento, Evidencia } from "./mock-data";

const KEYS = {
  USERS: "losscontrol_users",
  ITEMS: "losscontrol_items",
  CATEGORIES: "losscontrol_categories",
  EVENTS: "losscontrol_events",
  GALLERY: "losscontrol_gallery",
};

const get = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

const set = (key: string, value: any) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const StorageService = {
  // --- USUÁRIOS ---
  getUsers: (): User[] => {
    const users = get<User[]>(KEYS.USERS, []);
    if (users.length === 0) {
      const defaultUser: User = {
        id: "1",
        nome: "Admin Inicial",
        email: "admin@empresa.com",
        role: "dono",
        avatar: "",
      };
      set(KEYS.USERS, [defaultUser]);
      return [defaultUser];
    }
    return users;
  },

  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) users[index] = user;
    else users.push(user);
    set(KEYS.USERS, users);
  },

  // --- CATEGORIAS ---
  getCategorias: (): CategoriaData[] =>
    get<CategoriaData[]>(KEYS.CATEGORIES, []),

  saveCategoria: (cat: CategoriaData) => {
    const list = StorageService.getCategorias();
    const index = list.findIndex((c) => c.id === cat.id);
    if (index >= 0) list[index] = cat;
    else list.push(cat);
    set(KEYS.CATEGORIES, list);
  },

  // NOVA FUNÇÃO: Sincronizar categorias via importação CSV
  syncCategories: (categoryNames: string[]) => {
    const current = StorageService.getCategorias();
    // Cria um Set com nomes existentes (uppercase para evitar duplicatas "Bebidas" vs "BEBIDAS")
    const existingNames = new Set(current.map((c) => c.nome.toUpperCase()));
    const newCats: CategoriaData[] = [];

    categoryNames.forEach((name) => {
      if (!name) return;
      const cleanName = name.trim();
      // Se não existe, cria
      if (!existingNames.has(cleanName.toUpperCase())) {
        newCats.push({
          id: Math.random().toString(36).substr(2, 9),
          nome: cleanName,
          status: "ativa",
          itemCount: 0,
        });
        existingNames.add(cleanName.toUpperCase());
      }
    });

    if (newCats.length > 0) {
      set(KEYS.CATEGORIES, [...current, ...newCats]);
    }
  },

  deleteCategoria: (id: string) => {
    const list = StorageService.getCategorias().filter((c) => c.id !== id);
    set(KEYS.CATEGORIES, list);
  },

  // --- ITENS (CATÁLOGO) ---
  getItems: (): Item[] => get<Item[]>(KEYS.ITEMS, []),

  saveItem: (item: Item) => {
    const list = StorageService.getItems();
    const index = list.findIndex((i) => i.id === item.id);
    if (index >= 0) list[index] = item;
    else list.push(item);
    set(KEYS.ITEMS, list);
  },

  deleteItem: (id: string) => {
    const list = StorageService.getItems().filter((i) => i.id !== id);
    set(KEYS.ITEMS, list);
  },

  // --- EVENTOS ---
  getEventos: (): Evento[] => get<Evento[]>(KEYS.EVENTS, []),

  saveEvento: (evento: Evento) => {
    const list = StorageService.getEventos();
    const index = list.findIndex((e) => e.id === evento.id);
    if (index >= 0) list[index] = evento;
    else list.push(evento);
    set(KEYS.EVENTS, list);
  },

  // --- GALERIA ---
  getEvidenciasAvulsas: (): Evidencia[] => get<Evidencia[]>(KEYS.GALLERY, []),

  saveEvidenciaAvulsa: (evidencia: Evidencia) => {
    const list = StorageService.getEvidenciasAvulsas();
    const index = list.findIndex((e) => e.id === evidencia.id);
    if (index >= 0) list[index] = evidencia;
    else list.push(evidencia);
    set(KEYS.GALLERY, list);
  },

  deleteEvidenciaAvulsa: (id: string) => {
    const list = StorageService.getEvidenciasAvulsas().filter(
      (e) => e.id !== id,
    );
    set(KEYS.GALLERY, list);
  },

  getAllEvidencias: (): any[] => {
    const eventos = StorageService.getEventos();
    const avulsas = StorageService.getEvidenciasAvulsas();

    const doEventos = eventos.flatMap((evt) =>
      evt.evidencias.map((ev) => ({ ...ev, evento: evt })),
    );

    return [...doEventos, ...avulsas].sort(
      (a, b) =>
        new Date(b.dataUpload).getTime() - new Date(a.dataUpload).getTime(),
    );
  },

  clearAll: () => localStorage.clear(),
};
