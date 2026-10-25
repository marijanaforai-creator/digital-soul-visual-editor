export const PAGE_TITLES = [
  "Početna", "Biblioteka rešenja", "Blog", "Besplatni sadržaj",
  "Individualna saradnja", "AI alati", "Svi proizvodi", "Sistem", "O meni", "Česta pitanja"
];

export const BLOCK_TYPES = [
  ["hero", "Hero / naslovna sekcija"], ["heading", "Naslov i podnaslov"], ["text", "Tekst"],
  ["image", "Slika"], ["imageText", "Slika i tekst"], ["columns", "Dve ili tri kolone"],
  ["products", "Kartice proizvoda"], ["categories", "Kartice kategorija"], ["gallery", "Galerija slika"],
  ["cta", "CTA sekcija"], ["buttons", "Dugmad i linkovi"], ["blog", "Blog kartice"],
  ["resources", "Besplatni resursi"], ["contact", "Kontakt forma"], ["faq", "Česta pitanja"], ["custom", "Prazan / prilagođeni blok"]
];

export const BLOCK_PROPERTY_FIELDS = {
  hero: ["title", "subtitle", "body", "button", "image"],
  heading: ["title", "subtitle"],
  text: ["title", "body"],
  image: ["image"],
  imageText: ["title", "body", "image"],
  columns: ["title", "body", "columns"],
  products: ["title", "body", "image"],
  categories: ["title", "body", "image"],
  gallery: ["title", "image"],
  cta: ["title", "body", "button"],
  buttons: ["title", "body", "button"],
  blog: ["title", "body", "image"],
  resources: ["title", "body", "image"],
  contact: ["title", "body"],
  faq: ["title", "subtitle", "body"],
  custom: ["title", "subtitle", "body", "button", "image"]
};

export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function makeBlock(type = "text") {
  const label = BLOCK_TYPES.find(([key]) => key === type)?.[1] || "Prilagođeni blok";
  return {
    id: uid(), type,
    content: { title: label, subtitle: "Dodaj kratak podnaslov", body: "Klikni da uneseš tekst koji želiš da prikažeš na stranici.", buttonText: "Saznaj više", buttonLink: "", imageId: "", alt: "", aspectRatio: "16 / 9", columns: 2 },
    style: { background: "#f7f3eb", color: "#30243b", width: "wide", align: "left", spacing: 32, padding: 28, radius: 16, fontSize: 16, hiddenDesktop: false, hiddenTablet: false, hiddenMobile: false }
  };
}

export function makePage(title = "Nova stranica") {
  const hero = makeBlock("hero");
  hero.content.title = title;
  hero.content.subtitle = "Uredi naslov, tekst i izgled ove stranice.";
  return { id: uid(), title, isHome: false, blocks: [hero], implementation: "draft" };
}

export function findSelectedBlock(page, blockId) {
  return page?.blocks?.find(block => block.id === blockId) || null;
}

export function updatePageBlock(page, blockId, patch) {
  let updated = false;
  const blocks = page.blocks.map(block => {
    if (block.id !== blockId) return block;
    updated = true;
    return {
      ...block,
      ...patch,
      content: { ...block.content, ...(patch.content || {}) },
      style: { ...block.style, ...(patch.style || {}) }
    };
  });
  return updated ? { ...page, blocks } : page;
}

export function changeBlockType(block, type) {
  if (!BLOCK_PROPERTY_FIELDS[type]) return block;
  const defaults = makeBlock(type);
  const previousFields = BLOCK_PROPERTY_FIELDS[block.type] || [];
  const nextFields = BLOCK_PROPERTY_FIELDS[type];
  const content = { ...defaults.content };
  for (const field of nextFields) {
    if (!previousFields.includes(field)) continue;
    if (field === "button") {
      content.buttonText = block.content.buttonText;
      content.buttonLink = block.content.buttonLink;
    } else if (field === "image") {
      content.imageId = block.content.imageId;
      content.alt = block.content.alt;
      content.aspectRatio = block.content.aspectRatio || defaults.content.aspectRatio;
    } else if (field === "columns") {
      content.columns = block.content.columns;
    } else {
      content[field] = block.content[field];
    }
  }
  return { ...block, type, content };
}

export function makeProject() {
  const pages = PAGE_TITLES.map((title, i) => ({ ...makePage(title), isHome: i === 0, implementation: [0, 1, 2, 3, 4].includes(i) ? "prototype" : "planned" }));
  return { schemaVersion: 1, title: "Digital Soul", pages, activePageId: pages[0].id, media: [] };
}

export function validateProject(value, { allowLocalMedia = false } = {}) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.pages) || !Array.isArray(value.media)) throw new Error("JSON nije prepoznat kao Digital Soul projekat.");
  if (!value.pages.length || value.pages.length > 100) throw new Error("Projekat mora imati od 1 do 100 stranica.");
  const ids = new Set();
  const blockIds = new Set();
  const pages = value.pages.map(page => {
    if (!page || typeof page.id !== "string" || !page.id || ids.has(page.id) || typeof page.title !== "string" || !Array.isArray(page.blocks) || page.blocks.length > 200) throw new Error("Stranica ima neispravne podatke.");
    ids.add(page.id);
    const blocks = page.blocks.map(block => {
      if (!block || typeof block.id !== "string" || !block.id || blockIds.has(block.id) || typeof block.type !== "string" || !BLOCK_TYPES.some(([type]) => type === block.type) || !block.content || !block.style) throw new Error("Blok ima neispravne podatke.");
      blockIds.add(block.id);
      const defaults = makeBlock(block.type);
      const content = { ...defaults.content };
      Object.keys(content).forEach(key => { if (typeof block.content[key] === "string") content[key] = block.content[key].slice(0, key === "body" ? 12000 : 2000); });
      if ([2, 3].includes(block.content.columns)) content.columns = block.content.columns;
      const style = { ...defaults.style, ...block.style };
      style.background = /^#[\da-f]{6}$/i.test(style.background) ? style.background : defaults.style.background;
      style.color = /^#[\da-f]{6}$/i.test(style.color) ? style.color : defaults.style.color;
      style.width = ["narrow", "wide", "full"].includes(style.width) ? style.width : "wide";
      style.align = ["left", "center", "right"].includes(style.align) ? style.align : "left";
      ["spacing", "padding", "radius", "fontSize"].forEach(key => { const [min, max] = { spacing: [0, 96], padding: [0, 80], radius: [0, 40], fontSize: [12, 48] }[key]; const value = Number(style[key]); style[key] = Math.max(min, Math.min(max, Number.isFinite(value) ? value : defaults.style[key])); });
      ["hiddenDesktop", "hiddenTablet", "hiddenMobile"].forEach(key => { style[key] = Boolean(style[key]); });
      return { ...defaults, ...block, content, style };
    });
    return { ...page, title: page.title.trim().slice(0, 100), blocks };
  });
  if (pages.filter(page => page.isHome).length !== 1) throw new Error("Projekat mora imati tačno jednu početnu stranicu.");
  if (value.media.length > 200) throw new Error("Biblioteka može imati najviše 200 slika.");
  const mediaIds = new Set();
  const media = value.media.map(item => {
    if (!item || typeof item.id !== "string" || !item.id || mediaIds.has(item.id) || typeof item.name !== "string") throw new Error("Biblioteka sadrži neispravnu sliku.");
    mediaIds.add(item.id);
    if (typeof item.dataUrl === "string") {
      if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(item.dataUrl) || item.dataUrl.length > 7_000_000) throw new Error("Slika u uvozu je neispravna ili veća od dozvoljene veličine.");
      return { id: item.id, name: item.name.slice(0, 180), dataUrl: item.dataUrl };
    }
    if (!allowLocalMedia || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(item.type) || !Number.isFinite(item.size) || item.size < 0 || item.size > 5 * 1024 * 1024) throw new Error("Biblioteka sadrži neispravnu sliku.");
    return { id: item.id, name: item.name.slice(0, 180), type: item.type, size: item.size, alt: typeof item.alt === "string" ? item.alt.slice(0, 300) : "" };
  });
  if (media.reduce((sum, item) => sum + (item.dataUrl?.length || 0), 0) > 50_000_000) throw new Error("Ukupna veličina slika u uvozu prelazi 50 MB.");
  return { ...value, title: typeof value.title === "string" ? value.title.slice(0, 100) : "Digital Soul", pages, media, activePageId: pages.some(page => page.id === value.activePageId) ? value.activePageId : pages[0].id };
}
