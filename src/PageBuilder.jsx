import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, Eye, EyeOff, FilePlus2, GripVertical, ImagePlus, Monitor, Pencil, Plus, Redo2, Save, Smartphone, Tablet, Trash2, Undo2, Upload } from "lucide-react";
import { BLOCK_PROPERTY_FIELDS, BLOCK_TYPES, changeBlockType, findSelectedBlock, makeBlock, makePage, makeProject, uid, updatePageBlock, validateProject } from "./builderModel.js";
import "./builder.css";

const DB_NAME = "digital-soul-editor-storage";
const PROJECT_KEY = "digital-soul-page-builder-v1";
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts");
      if (!db.objectStoreNames.contains("builder-media")) db.createObjectStore("builder-media");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbRequest(store, mode, action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = action(tx.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
const getProject = () => dbRequest("drafts", "readonly", s => s.get(PROJECT_KEY));
const putProject = value => dbRequest("drafts", "readwrite", s => s.put(value, PROJECT_KEY));
const getBlob = id => dbRequest("builder-media", "readonly", s => s.get(id));
const putBlob = (id, blob) => dbRequest("builder-media", "readwrite", s => s.put(blob, id));
const dataURL = blob => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
const blobFromDataURL = value => { const [meta, encoded] = value.split(","); const bytes = atob(encoded); const array = Uint8Array.from(bytes, c => c.charCodeAt(0)); return new Blob([array], { type: meta.match(/^data:([^;]+)/)[1] }); };
const safeHref = value => {
  const href = value.trim();
  if (/^page:[\w-]+$/i.test(href) || /^#[\w-]+$/i.test(href)) return true;
  try { const url = new URL(href); return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) && (url.protocol === "mailto:" || url.protocol === "tel:" || Boolean(url.hostname)); } catch { return false; }
};

function BlockContent({ block, imageUrl, onSelect, onNavigate, selected, editing }) {
  const { title, subtitle, body, buttonText, buttonLink, alt } = block.content;
  const style = block.style;
  const common = { background: style.background, color: style.color, textAlign: style.align, borderRadius: `${style.radius}px`, padding: `${style.padding}px`, margin: `${style.spacing / 2}px auto`, width: style.width === "narrow" ? "min(100%, 620px)" : style.width === "full" ? "100%" : "min(100%, 1060px)", fontSize: `${style.fontSize}px` };
  const titleElement = <h2>{title || "Naslov bloka"}</h2>;
  const bodyElement = <p>{body || "Dodaj tekst u svojstva bloka."}</p>;
  const image = imageUrl ? <img src={imageUrl} alt={alt || ""} style={{ width: "100%", maxHeight: 380, objectFit: "cover", aspectRatio: block.content.aspectRatio || "16 / 9", display: "block" }} /> : <div className="builder-image-empty"><ImagePlus size={25} /><span>Izaberi sliku u svojstvima</span></div>;
  const action = buttonText ? <a className="builder-cta" href={buttonLink.startsWith("http") && safeHref(buttonLink) ? buttonLink : buttonLink.startsWith("#") && safeHref(buttonLink) ? buttonLink : undefined} target={buttonLink.startsWith("http") ? "_blank" : undefined} rel={buttonLink.startsWith("http") ? "noopener noreferrer" : undefined} onClick={event => { event.stopPropagation(); if (buttonLink.startsWith("page:") || buttonLink.startsWith("#")) { event.preventDefault(); if (safeHref(buttonLink)) onNavigate(buttonLink); } else if (!safeHref(buttonLink)) event.preventDefault(); }}>{buttonText}</a> : null;
  let inner;
  switch (block.type) {
    case "hero": inner = <>{<span className="builder-eyebrow">DIGITAL SOUL · NACRT</span>}{titleElement}<p className="builder-subtitle">{subtitle}</p>{bodyElement}{action}</>; break;
    case "heading": inner = <>{titleElement}<p className="builder-subtitle">{subtitle}</p></>; break;
    case "image": inner = image; break;
    case "imageText": inner = <div className="builder-image-text">{image}<div>{titleElement}{bodyElement}</div></div>; break;
    case "columns": inner = <div className="builder-columns" style={{ gridTemplateColumns: `repeat(${block.content.columns === 3 ? 3 : 2}, minmax(0,1fr))` }}>{Array.from({ length: block.content.columns === 3 ? 3 : 2 }, (_, i) => <article key={i}><span>0{i + 1}</span>{titleElement}<p>{body}</p></article>)}</div>; break;
    case "products": case "categories": case "blog": case "resources": inner = <>{titleElement}<div className="builder-card-grid">{[1, 2, 3].map(n => <article key={n}><div className="builder-card-art">{imageUrl ? <img src={imageUrl} alt={alt || ""} /> : <span>✧</span>}</div><h3>{n === 1 ? title : `${title || "Kartica"} ${n}`}</h3><p>{body}</p></article>)}</div></>; break;
    case "gallery": inner = <>{titleElement}<div className="builder-gallery">{image}</div></>; break;
    case "cta": case "buttons": inner = <>{titleElement}{bodyElement}{action}</>; break;
    case "contact": inner = <>{titleElement}{bodyElement}<label className="builder-contact-label">Email<input placeholder="Imejl adresa" disabled /></label><label className="builder-contact-label">Poruka<textarea placeholder="Tvoja poruka" disabled /></label><button className="builder-cta" type="button" disabled>Pošalji · primer</button><small>Kontakt forma je samo vizuelni primer; slanje nije povezano.</small></>; break;
    case "faq": inner = <>{titleElement}{[1, 2, 3].map(n => <details key={n} className="builder-faq"><summary>{n === 1 ? subtitle : `Često pitanje ${n}`}</summary><p>{body}</p></details>)}</>; break;
    case "text": inner = <>{titleElement}{bodyElement}</>; break;
    default: inner = <>{titleElement}{bodyElement}</>;
  }
  const label = BLOCK_TYPES.find(([type]) => type === block.type)?.[1] || "Blok";
  return <section className={`builder-block ${selected.id ? "builder-block-selected" : ""}`} aria-label={`${label}. Klikni za izbor i uređivanje.`} tabIndex={editing ? 0 : undefined} style={{ ...common, display: (selected.device === "Desktop" && style.hiddenDesktop) || (selected.device === "Tablet" && style.hiddenTablet) || (selected.device === "Mobile" && style.hiddenMobile) ? "none" : undefined }} onClick={e => { e.stopPropagation(); onSelect(block.id); }} onKeyDown={event => { if (editing && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(block.id); } }}>
    {editing && <div className="builder-block-label"><GripVertical size={13} />{BLOCK_TYPES.find(([type]) => type === block.type)?.[1]}</div>}{inner}
  </section>;
}

export default function PageBuilder({ onExit }) {
  const [project, setProject] = useState(makeProject);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [mode, setMode] = useState("edit");
  const [device, setDevice] = useState("Desktop");
  const [status, setStatus] = useState("Učitavanje lokalnog nacrta…");
  const [hydrated, setHydrated] = useState(false);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState("");
  const [mediaUrls, setMediaUrls] = useState({});
  const importRef = useRef(null);
  const uploadRef = useRef(null);
  const history = useRef({ undo: [], redo: [], current: "" });
  const activePage = project.pages.find(p => p.id === project.activePageId) || project.pages[0];
  const selectedBlock = findSelectedBlock(activePage, selectedBlockId);
  const selectedProperties = BLOCK_PROPERTY_FIELDS[selectedBlock?.type] || [];
  const supportsSelectedProperty = property => selectedProperties.includes(property);
  const dirtySnapshot = JSON.stringify(project);

  useEffect(() => {
    let live = true;
    getProject().then(value => { if (live && value) { const parsed = validateProject(value, { allowLocalMedia: true }); history.current.current = JSON.stringify(parsed); setProject(parsed); setStatus("Lokalni nacrt oporavljen"); } else if (live) { history.current.current = JSON.stringify(project); setStatus("Novi lokalni nacrt"); } }).catch(() => { if (live) setStatus("Novi lokalni nacrt · skladište nije dostupno"); }).finally(() => { if (live) setHydrated(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => { history.current.current = dirtySnapshot; }, []);
  useEffect(() => {
    const id = setTimeout(async () => {
      if (!hydrated) return;
      setStatus("Čuvanje…");
      try { await putProject(project); setStatus("Sačuvano u ovom pregledaču"); }
      catch { setStatus("Greška pri čuvanju"); setError("Nacrt nije sačuvan. Proveri slobodan prostor u pregledaču."); }
    }, 700);
    return () => clearTimeout(id);
  }, [project, hydrated]);
  useEffect(() => {
    let live = true;
    Promise.all(project.media.map(async item => [item.id, await getBlob(item.id)] )).then(entries => {
      if (!live) return;
      const urls = {};
      entries.forEach(([id, blob]) => { if (blob) urls[id] = URL.createObjectURL(blob); });
      setMediaUrls(previous => { Object.values(previous).forEach(URL.revokeObjectURL); return urls; });
    }).catch(() => {});
    return () => { live = false; };
  }, [project.media]);

  function commit(next) {
    const snapshot = JSON.stringify(project);
    const value = typeof next === "function" ? next(project) : next;
    const nextSnapshot = JSON.stringify(value);
    if (snapshot !== nextSnapshot) history.current.undo.push(snapshot);
    if (history.current.undo.length > 50) history.current.undo.shift();
    history.current.redo = [];
    history.current.current = nextSnapshot;
    setHistoryState({ undo: history.current.undo.length, redo: 0 });
    setProject(value); setError("");
  }
  function moveHistory(direction) {
    const source = direction === "undo" ? "undo" : "redo";
    const target = direction === "undo" ? "redo" : "undo";
    const snapshot = history.current[source].pop();
    if (!snapshot) return;
    const currentSnapshot = JSON.stringify(project);
    if (currentSnapshot !== snapshot) history.current[target].push(currentSnapshot);
    const parsed = validateProject(JSON.parse(snapshot), { allowLocalMedia: true });
    history.current.current = JSON.stringify(parsed);
    setHistoryState({ undo: history.current.undo.length, redo: history.current.redo.length });
    setProject(parsed); setError("");
  }
  const updatePage = (id, patch) => commit(current => ({ ...current, pages: current.pages.map(page => page.id === id ? { ...page, ...patch } : page) }));
  const updateBlock = (id, patch) => commit(current => ({ ...current, pages: current.pages.map(page => page.id === current.activePageId ? updatePageBlock(page, id, patch) : page) }));
  const imageForBlock = block => mediaUrls[block.content.imageId] || "";
  async function save() { setError(""); setStatus("Čuvanje…"); try { await putProject(project); setStatus("Sačuvano u ovom pregledaču"); } catch { setStatus("Greška pri čuvanju"); setError("Nacrt nije sačuvan. Pregledaj slobodan prostor u pregledaču."); } }
  function addPage() { const page = makePage("Nova stranica"); commit(current => ({ ...current, pages: [...current.pages, page], activePageId: page.id })); setSelectedBlockId(page.blocks[0].id); }
  function duplicatePage(page) { const duplicate = { ...structuredClone(page), id: uid(), title: `${page.title} (kopija)`, isHome: false, blocks: page.blocks.map(block => ({ ...structuredClone(block), id: uid() })) }; commit(current => ({ ...current, pages: [...current.pages, duplicate], activePageId: duplicate.id })); }
  function deletePage(page) { if (project.pages.length < 2) { setError("Projekat mora imati najmanje jednu stranicu."); return; } if (!window.confirm(`Obrisati stranicu „${page.title}“?`)) return; commit(current => { const pages = current.pages.filter(item => item.id !== page.id); if (!pages.some(item => item.isHome)) pages[0] = { ...pages[0], isHome: true }; return { ...current, pages, activePageId: page.id === activePage.id ? pages[0].id : current.activePageId }; }); setSelectedBlockId(""); }
  function reorderPage(index, offset) { const target = index + offset; if (target < 0 || target >= project.pages.length) return; const pages = [...project.pages]; [pages[index], pages[target]] = [pages[target], pages[index]]; commit(current => ({ ...current, pages })); }
  function addBlock(type) { const block = makeBlock(type); commit(current => ({ ...current, pages: current.pages.map(page => page.id === current.activePageId ? { ...page, blocks: [...page.blocks, block] } : page) })); setSelectedBlockId(block.id); }
  function reorderBlock(index, offset) { const target = index + offset; if (target < 0 || target >= activePage.blocks.length) return; const blocks = [...activePage.blocks]; [blocks[index], blocks[target]] = [blocks[target], blocks[index]]; updatePage(activePage.id, { blocks }); }
  function duplicateBlock(block) { const duplicate = { ...structuredClone(block), id: uid() }; commit(current => ({ ...current, pages: current.pages.map(page => { if (page.id !== current.activePageId) return page; const blocks = [...page.blocks]; const index = blocks.findIndex(item => item.id === block.id); blocks.splice(index + 1, 0, duplicate); return { ...page, blocks }; }) })); setSelectedBlockId(duplicate.id); }
  function removeBlock(block) { if (!window.confirm("Obrisati ovaj blok?")) return; commit(current => ({ ...current, pages: current.pages.map(page => page.id === current.activePageId ? { ...page, blocks: page.blocks.filter(item => item.id !== block.id) } : page) })); setSelectedBlockId(""); }
  function reorderPageDrop(targetId) { if (!dragging || dragging === targetId) return; const pages = [...project.pages]; const from = pages.findIndex(page => page.id === dragging); const to = pages.findIndex(page => page.id === targetId); const [item] = pages.splice(from, 1); pages.splice(to, 0, item); commit(current => ({ ...current, pages })); setDragging(""); }
  function reorderBlockDrop(targetId) { if (!dragging || dragging === targetId) return; commit(current => ({ ...current, pages: current.pages.map(page => { if (page.id !== current.activePageId) return page; const blocks = [...page.blocks]; const from = blocks.findIndex(block => block.id === dragging); const to = blocks.findIndex(block => block.id === targetId); const [item] = blocks.splice(from, 1); blocks.splice(to, 0, item); return { ...page, blocks }; }) })); setDragging(""); }
  async function uploadMedia(event) {
    const files = [...(event.target.files || [])]; event.target.value = ""; if (!files.length) return;
    try {
      const uploaded = [];
      for (const file of files) {
        if (!file.type.startsWith("image/") || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) throw new Error("Podržani formati su JPG, PNG, WebP i GIF.");
        if (file.size > 5 * 1024 * 1024) throw new Error("Slika mora biti manja od 5 MB.");
        const id = uid(); await putBlob(id, file);
        uploaded.push({ id, file, meta: { id, name: file.name, type: file.type, size: file.size, alt: "" } });
      }
      if (!uploaded.length) return;
      const last = uploaded[uploaded.length - 1];
      const attachToSelectedBlock = selectedBlock && supportsSelectedProperty("image");
      commit(current => ({
        ...current,
        media: [...current.media, ...uploaded.map(item => item.meta)],
        pages: attachToSelectedBlock ? current.pages.map(page => page.id === current.activePageId ? { ...page, blocks: page.blocks.map(block => block.id === selectedBlockId ? { ...block, content: { ...block.content, imageId: last.id, alt: block.content.alt || last.file.name.replace(/\.[^.]+$/, "") } } : block) } : page) : current.pages
      }));
      setMediaUrls(current => ({ ...current, ...Object.fromEntries(uploaded.map(({ id, file }) => [id, URL.createObjectURL(file)])) }));
    } catch (e) { setError(e.message || "Slika nije mogla da se doda u biblioteku."); }
  }
  async function removeMedia(item) {
    if (!window.confirm(`Ukloniti „${item.name}“ iz biblioteke i sa blokova koji je koriste?`)) return;
    const pages = project.pages.map(page => ({ ...page, blocks: page.blocks.map(block => block.content.imageId === item.id ? { ...block, content: { ...block.content, imageId: "" } } : block) }));
    commit(current => ({ ...current, media: current.media.filter(media => media.id !== item.id), pages }));
    if (mediaUrls[item.id]) URL.revokeObjectURL(mediaUrls[item.id]);
    setMediaUrls(current => { const next = { ...current }; delete next[item.id]; return next; });
  }
  async function exportProject() {
    try {
      const media = await Promise.all(project.media.map(async item => ({ ...item, dataUrl: await dataURL(await getBlob(item.id)) })));
      const blob = new Blob([JSON.stringify({ ...project, media }, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = href; link.download = "digital-soul-projekat.json"; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
      setStatus("JSON izvezen");
    } catch { setError("Izvoz nije uspeo. Neke slike nisu dostupne u lokalnoj biblioteci."); }
  }
  async function importProject(event) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      if (file.size > 60 * 1024 * 1024) throw new Error("JSON projekat mora biti manji od 60 MB.");
      const parsed = validateProject(JSON.parse(await file.text()));
      if (!window.confirm("Uvezeni projekat će zameniti trenutni lokalni nacrt. Nastaviti?")) return;
      const importedBlobs = parsed.media.map(item => ({ item, blob: blobFromDataURL(item.dataUrl) }));
      const importedMedia = importedBlobs.map(({ item, blob }) => ({ id: item.id, name: item.name, type: blob.type, size: blob.size, alt: "" }));
      const { media, ...cleanProject } = parsed;
      for (const { item, blob } of importedBlobs) await putBlob(item.id, blob);
      const projectValue = { ...cleanProject, media: importedMedia };
      commit(projectValue); setSelectedBlockId(""); setStatus("Uvezeni lokalni nacrt");
    } catch (e) { setError(e.message || "Uvoz projekta nije uspeo."); }
  }
  function setHomepage(pageId) { commit(current => ({ ...current, pages: current.pages.map(page => ({ ...page, isHome: page.id === pageId })) })); }

  const pageList = project.pages;
  return <div className="app-shell builder-shell">
    <header className="topbar builder-topbar"><div className="brand-lockup"><div className="brand-mark">DS</div><div><div className="brand-title">Digital Soul</div><div className="brand-subtitle">VIZUELNI PAGE BUILDER</div></div></div><div className="top-actions"><span className="save-state"><span className="state-dot" />{status}</span><button className="button button-quiet" title="Undo" aria-label="Poništi izmenu" disabled={!historyState.undo} onClick={() => moveHistory("undo")}><Undo2 size={16} /></button><button className="button button-quiet" title="Redo" aria-label="Ponovi izmenu" disabled={!historyState.redo} onClick={() => moveHistory("redo")}><Redo2 size={16} /></button><button className="button button-quiet" onClick={exportProject}><Download size={16}/> Izvezi JSON</button><button className="button button-primary" onClick={save}><Save size={16}/> Sačuvaj nacrt</button><button className="button button-quiet" onClick={onExit}>Stari editor</button></div></header>
    <div className="builder-grid">
      <aside className="builder-sidebar">
        <div className="builder-panel-title"><span className="panel-kicker">STRANICE</span><button className="builder-icon-button" aria-label="Dodaj stranicu" title="Dodaj stranicu" onClick={addPage}><Plus size={17}/></button></div>
        <button className="builder-add-page" onClick={addPage}><FilePlus2 size={16}/> Nova stranica</button>
        <div className="builder-page-list">{pageList.map((page, index) => <div className={`builder-page-row ${page.id === activePage.id ? "active" : ""}`} key={page.id} draggable onDragStart={() => setDragging(page.id)} onDragOver={e => e.preventDefault()} onDrop={() => reorderPageDrop(page.id)}>
          <button className="builder-page-name" onClick={() => { commit(current => ({ ...current, activePageId: page.id })); setSelectedBlockId(""); }}><span>{page.title}</span><small>{page.isHome ? "Početna · " : ""}{page.implementation === "prototype" ? "prototip sekcija" : page.implementation === "planned" ? "nije implementirana" : "nacrt"}</small></button>
          <div className="builder-mini-actions"><button aria-label={`Pomeri ${page.title} gore`} disabled={index === 0} onClick={() => reorderPage(index, -1)}><ArrowUp size={13}/></button><button aria-label={`Pomeri ${page.title} dole`} disabled={index === pageList.length - 1} onClick={() => reorderPage(index, 1)}><ArrowDown size={13}/></button><button aria-label={`Dupliraj ${page.title}`} onClick={() => duplicatePage(page)}><Copy size={13}/></button></div>
        </div>)}</div>
        <label className="builder-field-label">Naziv aktivne stranice<input value={activePage.title} maxLength={100} onChange={e => updatePage(activePage.id, { title: e.target.value })}/></label>
        <label className="builder-home-check"><input type="checkbox" checked={activePage.isHome} onChange={() => setHomepage(activePage.id)}/> Početna stranica</label>
        <button className="builder-danger-button" onClick={() => deletePage(activePage)}><Trash2 size={14}/> Obriši aktivnu stranicu</button>
        <p className="builder-muted">Oznaka „prototip sekcija“ znači da postoji prikaz te sekcije u starom editoru. Ona još nije automatski konvertovana u ove blokove.</p>
        <div className="builder-divider"/><div className="builder-panel-title"><span className="panel-kicker">DODAJ BLOK</span></div>
        <div className="builder-block-library">{BLOCK_TYPES.map(([type, label]) => <button key={type} onClick={() => addBlock(type)}><Plus size={13}/>{label}</button>)}</div>
        <div className="builder-divider"/><div className="builder-panel-title"><span className="panel-kicker">BIBLIOTEKA MEDIJA</span><button className="builder-icon-button" aria-label="Dodaj sliku u biblioteku" onClick={() => uploadRef.current?.click()}><Upload size={15}/></button></div>
        <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={uploadMedia}/><button className="builder-add-page" onClick={() => uploadRef.current?.click()}><ImagePlus size={15}/> Učitaj sliku · do 5 MB</button>
        <div className="builder-media-list">{project.media.length ? project.media.map(item => <div className="builder-media-item" key={item.id}><button disabled={!supportsSelectedProperty("image")} title={supportsSelectedProperty("image") ? "Izaberi ovu sliku za blok" : "Izaberi blok koji podržava sliku"} onClick={() => selectedBlock && updateBlock(selectedBlock.id, { content: { imageId: item.id, alt: item.alt || item.name.replace(/\.[^.]+$/, "") } })}><img src={mediaUrls[item.id] || ""} alt=""/><span>{item.name}</span></button><button aria-label={`Ukloni ${item.name}`} onClick={() => removeMedia(item)}><Trash2 size={13}/></button></div>) : <p className="builder-muted">Slike ostaju lokalno u IndexedDB pregledača.</p>}</div>
        <button className="builder-add-page" onClick={() => importRef.current?.click()}><Upload size={15}/> Uvezi JSON</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importProject}/>
      </aside>
      <main className="builder-main">
        <div className="builder-toolbar"><div><span className="panel-kicker">NAZIV STRANICE</span><h1>{activePage.title || "Nova stranica"}</h1><span className="builder-toolbar-hint">Klikni blok u platnu da urediš njegov sadržaj.</span></div><div className="builder-device-switch">{[["Desktop", Monitor], ["Tablet", Tablet], ["Mobile", Smartphone]].map(([name, Icon]) => <button key={name} className={device === name ? "active" : ""} title={name} aria-label={`Pregled ${name}`} onClick={() => setDevice(name)}><Icon size={16}/></button>)}</div><button className={`button ${mode === "preview" ? "button-primary" : "button-quiet"}`} onClick={() => setMode(mode === "edit" ? "preview" : "edit")}>{mode === "edit" ? <><Eye size={15}/> Pregled</> : <><Pencil size={15}/> Uredi</>}</button></div>
        <div className={`builder-canvas builder-canvas-${device.toLowerCase()}`}>
          <nav className="builder-site-nav"><strong>Marijana Digital Soul</strong><div>Početna　 AI alati　 Biblioteka rešenja　 Svi proizvodi　 Više</div><span>Linkovi nisu povezani</span></nav>
        <div className="builder-page-canvas">{activePage.blocks.length ? activePage.blocks.map((block, index) => <div className="builder-block-wrap" id={`block-${block.id}`} key={block.id} draggable={mode === "edit"} onDragStart={() => setDragging(block.id)} onDragOver={e => e.preventDefault()} onDrop={() => reorderBlockDrop(block.id)}>
            <BlockContent block={block} imageUrl={imageForBlock(block)} onSelect={setSelectedBlockId} onNavigate={destination => { if (destination.startsWith("page:")) { const pageId = destination.slice(5); if (project.pages.some(page => page.id === pageId)) { commit(current => ({ ...current, activePageId: pageId })); setSelectedBlockId(""); } } else document.getElementById(`block-${destination.slice(1)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} selected={{ id: selectedBlockId === block.id, hidden: false, device }} editing={mode === "edit"}/>
            {mode === "edit" && selectedBlockId === block.id && <div className="builder-block-controls"><button title="Gore" onClick={() => reorderBlock(index, -1)}><ArrowUp size={14}/></button><button title="Dole" onClick={() => reorderBlock(index, 1)}><ArrowDown size={14}/></button><button title="Dupliraj" onClick={() => duplicateBlock(block)}><Copy size={14}/></button><button title={block.style.hiddenDesktop ? "Prikaži" : "Sakrij"} onClick={() => updateBlock(block.id, { style: { hiddenDesktop: !block.style.hiddenDesktop } })}>{block.style.hiddenDesktop ? <Eye size={14}/> : <EyeOff size={14}/>}</button><button title="Obriši" onClick={() => removeBlock(block)}><Trash2 size={14}/></button></div>}</div>) : <div className="builder-empty"><h2>Dodaj prvi blok na ovu stranicu</h2><p>Izaberi blok iz leve biblioteke. Ovaj prazan nacrt je nezavisan od sekcija prototipa.</p></div>}</div>
        </div>
        <div className="builder-publish-note">Nacrt i mediji se čuvaju samo u ovom pregledaču i na ovom uređaju. Pregled i JSON izvoz rade lokalno. Objavljivanje i linkovanje sa mindstru.site nisu povezani.</div>
      </main>
      <aside className="builder-inspector"><div className="builder-panel-title"><div><span className="panel-kicker">{selectedBlock ? "SVOJSTVA BLOKA" : "SVOJSTVA"}</span><h2>{selectedBlock ? BLOCK_TYPES.find(([type]) => type === selectedBlock.type)?.[1] || "Blok" : "Izaberi blok"}</h2></div></div>
        {selectedBlock ? <div className="builder-properties">
          <label className="builder-field-label">Tip bloka<select value={selectedBlock.type} onChange={e => updateBlock(selectedBlock.id, changeBlockType(selectedBlock, e.target.value))}>{BLOCK_TYPES.map(([type, label]) => <option value={type} key={type}>{label}</option>)}</select></label>
          {supportsSelectedProperty("title") && <label className="builder-field-label">Naslov<input value={selectedBlock.content.title} onChange={e => updateBlock(selectedBlock.id, { content: { title: e.target.value } })}/></label>}
          {supportsSelectedProperty("subtitle") && <label className="builder-field-label">Podnaslov<input value={selectedBlock.content.subtitle} onChange={e => updateBlock(selectedBlock.id, { content: { subtitle: e.target.value } })}/></label>}
          {supportsSelectedProperty("body") && <label className="builder-field-label">{selectedBlock.type === "hero" ? "Opis" : "Tekst"}<textarea rows={4} value={selectedBlock.content.body} onChange={e => updateBlock(selectedBlock.id, { content: { body: e.target.value } })}/></label>}
          {supportsSelectedProperty("columns") && <label className="builder-field-label">Broj kolona<select value={selectedBlock.content.columns} onChange={e => updateBlock(selectedBlock.id, { content: { columns: Number(e.target.value) } })}><option value={2}>Dve kolone</option><option value={3}>Tri kolone</option></select></label>}
          {supportsSelectedProperty("button") && <>
            <label className="builder-field-label">Tekst dugmeta<input value={selectedBlock.content.buttonText} onChange={e => updateBlock(selectedBlock.id, { content: { buttonText: e.target.value } })}/></label>
            <label className="builder-field-label">Odredište dugmeta<select value={selectedBlock.content.buttonLink.startsWith("page:") || selectedBlock.content.buttonLink.startsWith("#") ? selectedBlock.content.buttonLink : selectedBlock.content.buttonLink ? "__url__" : ""} onChange={e => updateBlock(selectedBlock.id, { content: { buttonLink: e.target.value === "__url__" ? "https://" : e.target.value } })}><option value="">Nije povezano</option><optgroup label="Stranice projekta">{project.pages.map(page => <option key={page.id} value={`page:${page.id}`}>{page.title}</option>)}</optgroup><optgroup label="Sekcije ove stranice">{activePage.blocks.filter(block => block.id !== selectedBlock.id).map((block, index) => <option key={block.id} value={`#${block.id}`}>{BLOCK_TYPES.find(([type]) => type === block.type)?.[1]} · {index + 1}</option>)}</optgroup><option value="__url__">Eksterni URL…</option></select></label>
            {(selectedBlock.content.buttonLink.startsWith("http") || selectedBlock.content.buttonLink === "https://") && <label className="builder-field-label">Eksterni URL<input placeholder="https://primer.rs" value={selectedBlock.content.buttonLink} onChange={e => updateBlock(selectedBlock.id, { content: { buttonLink: e.target.value } })}/></label>}
            {selectedBlock.content.buttonLink && !safeHref(selectedBlock.content.buttonLink) && <p className="builder-error">Unesi URL koji počinje sa https://, http://, mailto:, tel: ili #.</p>}
          </>}
          {supportsSelectedProperty("image") && <>
            <label className="builder-field-label">Fotografija<select value={selectedBlock.content.imageId} onChange={e => updateBlock(selectedBlock.id, { content: { imageId: e.target.value } })}><option value="">Bez fotografije</option>{project.media.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="builder-field-label">Alternativni tekst<input value={selectedBlock.content.alt} onChange={e => updateBlock(selectedBlock.id, { content: { alt: e.target.value } })}/></label>
            <label className="builder-field-label">Odnos stranica slike<select value={selectedBlock.content.aspectRatio || "16 / 9"} onChange={e => updateBlock(selectedBlock.id, { content: { aspectRatio: e.target.value } })}><option value="16 / 9">16:9 · široka</option><option value="4 / 3">4:3</option><option value="1 / 1">1:1 · kvadrat</option><option value="3 / 4">3:4 · portret</option><option value="auto">Originalni odnos</option></select></label>
          </>}
          <div className="builder-field-grid"><label className="builder-field-label">Širina<select value={selectedBlock.style.width} onChange={e => updateBlock(selectedBlock.id, { style: { width: e.target.value } })}><option value="narrow">Uska</option><option value="wide">Široka</option><option value="full">Puna</option></select></label><label className="builder-field-label">Poravnanje<select value={selectedBlock.style.align} onChange={e => updateBlock(selectedBlock.id, { style: { align: e.target.value } })}><option value="left">Levo</option><option value="center">Centar</option><option value="right">Desno</option></select></label></div>
          <div className="builder-field-grid"><label className="builder-field-label">Pozadina<input type="color" value={selectedBlock.style.background} onChange={e => updateBlock(selectedBlock.id, { style: { background: e.target.value } })}/></label><label className="builder-field-label">Boja teksta<input type="color" value={selectedBlock.style.color} onChange={e => updateBlock(selectedBlock.id, { style: { color: e.target.value } })}/></label></div>
          <label className="builder-field-label">Veličina fonta · {selectedBlock.style.fontSize}px<input type="range" min="12" max="48" value={selectedBlock.style.fontSize} onChange={e => updateBlock(selectedBlock.id, { style: { fontSize: Number(e.target.value) } })}/></label>
          <label className="builder-field-label">Razmak · {selectedBlock.style.spacing}px<input type="range" min="0" max="96" step="4" value={selectedBlock.style.spacing} onChange={e => updateBlock(selectedBlock.id, { style: { spacing: Number(e.target.value) } })}/></label>
          <label className="builder-field-label">Unutrašnji razmak · {selectedBlock.style.padding}px<input type="range" min="0" max="80" step="4" value={selectedBlock.style.padding} onChange={e => updateBlock(selectedBlock.id, { style: { padding: Number(e.target.value) } })}/></label>
          <label className="builder-field-label">Zaobljenje · {selectedBlock.style.radius}px<input type="range" min="0" max="40" value={selectedBlock.style.radius} onChange={e => updateBlock(selectedBlock.id, { style: { radius: Number(e.target.value) } })}/></label>
          <div className="builder-device-checks"><span>Vidljivost</span>{[["Desktop", "hiddenDesktop"], ["Tablet", "hiddenTablet"], ["Telefon", "hiddenMobile"]].map(([label, key]) => <label key={key}><input type="checkbox" checked={!selectedBlock.style[key]} onChange={e => updateBlock(selectedBlock.id, { style: { [key]: !e.target.checked } })}/>{label}</label>)}</div>
        </div> : <p className="builder-muted">Izaberi blok na platnu da vidiš njegova svojstva.</p>}
        <div className="builder-inspector-bottom"><strong>Ograničenja prototipa</strong><p>Linkovi su prikazni dok ne izabereš validan URL. Kontakt forma ne šalje podatke. Objavljivanje nije povezano.</p></div>
      </aside>
    </div>
    {error && <div className="builder-toast" role="alert">{error}<button onClick={() => setError("")}>Zatvori</button></div>}
  </div>;
}
