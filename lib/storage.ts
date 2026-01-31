// lib/storage.ts
import { Item, CategoriaData, User, Evento, UserRole } from "./mock-data";

// Chaves para salvar no navegador
const KEYS = {
  USERS: "losscontrol_users",
  ITEMS: "losscontrol_items",
  CATEGORIES: "losscontrol_categories",
  EVENTS: "losscontrol_events",
};

// === GENERIC HELPERS ===
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

// === API DE DADOS ===

export const StorageService = {
  // --- USUÁRIOS ---
  getUsers: (): User[] => {
    const users = get<User[]>(KEYS.USERS, []);
    // Se não tiver usuário, cria o Admin padrão para você não ficar trancado fora
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

  // --- EVENTOS ---
  getEventos: (): Evento[] => get<Evento[]>(KEYS.EVENTS, []),

  saveEvento: (evento: Evento) => {
    const list = StorageService.getEventos();
    const index = list.findIndex((e) => e.id === evento.id);
    if (index >= 0) list[index] = evento;
    else list.push(evento);
    set(KEYS.EVENTS, list);
  },

  // Limpar tudo (para testes)
  clearAll: () => localStorage.clear(),
};
