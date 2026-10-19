import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Eye, ImagePlus, LayoutTemplate, Monitor, Pencil, Save, Smartphone, Tablet, Type, Undo2, Upload, X } from "lucide-react";

const initial = {
  brand: "Marijana Digital Soul",
  eyebrow: "DIGITALNI ALATI · JEDNOSTAVNI SISTEMI",
  headline: "Tvoja ideja, tvoj glas, tvoj sistem",
  description: "Mesto za digitalne proizvode, pametne alate i sisteme koji ti pomažu da organizuješ ideje i razvijaš online posao",
  button: "Istraži biblioteku",
  image: ""
};
const fields = [
  { key: "brand", label: "Naziv brenda" },
  { key: "eyebrow", label: "Mali naslov" },
  { key: "headline", label: "Glavni naslov" },
  { key: "description", label: "Opis" },
  { key: "button", label: "Tekst dugmeta" }
];

export default function App() {
  const [content, setContent] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [selected, setSelected] = useState("headline");
  const [editing, setEditing] = useState(true);
  const [device, setDevice] = useState("desktop");
  const [status, setStatus] = useState("Novi nacrt");
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const uploadRef = useRef(null);

  useEffect(() => {
    try {
      const draft = localStorage.getItem("digital-soul-editor-draft");
      if (draft) {
        const parsed = { ...initial, ...JSON.parse(draft) };
        setContent(parsed); setSaved(parsed); setStatus("Učitan lokalni nacrt");
      }
    } catch { setStatus("Novi nacrt"); }
  }, []);

  const update = (key, value) => {
    setContent(current => ({ ...current, [key]: value }));
    setStatus("Nesačuvane izmene");
  };
  const saveDraft = () => {
    try {
      localStorage.setItem("digital-soul-editor-draft", JSON.stringify(content));
      setSaved(content); setStatus("Nacrt sačuvan na ovom uređaju"); setSaveNotice("Nacrt je sačuvan u ovom pregledaču. Javni sajt nije promenjen."); setError("");
    } catch { setStatus("Nije moguće sačuvati nacrt"); setSaveNotice(""); setError("Nacrt nije sačuvan. Proveri da li pregledač dozvoljava lokalno čuvanje ili pokušaj da ukloniš i ponovo dodaš veliku fotografiju."); }
  };
  const discard = () => { setContent(saved); setStatus("Vraćeno na poslednji sačuvani nacrt"); setError(""); };
  const chooseImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Izaberi datoteku slike."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Za prototip izaberi sliku manju od 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { update("image", String(reader.result)); setSelected("image"); setError(""); };
    reader.onerror = () => setError("Slika nije mogla da se učita.");
    reader.readAsDataURL(file); event.target.value = "";
  };
  const dirty = JSON.stringify(content) !== JSON.stringify(saved);
  const select = key => { if (editing) setSelected(key); };
  const editable = (key, className, children) => (
    <div className={`editable ${className} ${selected === key && editing ? "chosen" : ""}`} onClick={() => select(key)}>
      {selected === key && editing && <span className="selection-label">{fields.find(f => f.key === key)?.label.toUpperCase()}</span>}
      {children}
    </div>
  );

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark">DS</div><div><div className="brand-title">Digital Soul</div><div className="brand-subtitle">VIZUELNI EDITOR · PROTOTIP</div></div></div>
      <div className="top-actions"><span className={`save-state ${dirty ? "dirty" : ""}`}><span className="state-dot"/>{dirty ? "Nesačuvane izmene" : status}</span><button className="button button-quiet" onClick={discard}><Undo2 size={16}/> Vrati</button><button className="button button-primary" onClick={saveDraft}><Save size={16}/> Sačuvaj nacrt</button></div>
    </header>
    <div className="workspace">
      <aside className="left-panel">
        <div className="panel-heading"><div><span className="panel-kicker">RADNI PROSTOR</span><h2>Uređivanje sajta</h2></div><LayoutTemplate size={19}/></div>
        <div className="mode-switch"><button className={editing ? "active" : ""} onClick={() => setEditing(true)}><Pencil size={15}/> Uredi</button><button className={!editing ? "active" : ""} onClick={() => setEditing(false)}><Eye size={15}/> Pregled</button></div>
        <div className="panel-section"><div className="section-title">ELEMENTI STRANICE</div>{fields.map(f => <button key={f.key} className={`element-row ${selected === f.key ? "selected" : ""}`} onClick={() => { setSelected(f.key); setEditing(true); }}><Type size={16}/><span>{f.label}</span><Pencil size={13}/></button>)}<button className={`element-row ${selected === "image" ? "selected" : ""}`} onClick={() => { setSelected("image"); setEditing(true); }}><ImagePlus size={16}/><span>Fotografija</span></button></div>
        <div className="panel-section"><div className="section-title">BIBLIOTEKA MEDIJA</div><div className="upload-card"><div className="upload-icon"><Upload size={20}/></div><strong>Dodaj fotografiju</strong><p>Izaberi sliku sa računara za ovaj prototip.</p><button className="button button-outline full-width" onClick={() => uploadRef.current?.click()}><ImagePlus size={15}/> Umetni sliku</button><input ref={uploadRef} type="file" accept="image/*" hidden onChange={chooseImage}/>{error && <p className="error-message">{error}</p>}</div></div>
        <div className="panel-note"><span className="note-icon">i</span><p>Promene se čuvaju samo u ovom pregledaču, ne na javnom sajtu.</p></div>
      </aside>
      <main className="canvas-area">
        <div className="canvas-toolbar"><div className="breadcrumb"><span>Moji sajtovi</span><span>/</span><strong>Početna stranica</strong><span className="draft-tag">NACRT</span></div><div className="device-switch"><button className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} title="Računar"><Monitor size={16}/></button><button className={device === "tablet" ? "active" : ""} onClick={() => setDevice("tablet")} title="Tablet"><Tablet size={16}/></button><button className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} title="Telefon"><Smartphone size={16}/></button></div><button className="preview-button" onClick={() => setEditing(!editing)}>{editing ? <><Eye size={15}/> Pregled</> : <><Pencil size={15}/> Nastavi uređivanje</>}</button></div>
        <div className="preview-stage"><div className={`website-preview ${device} ${editing ? "editing" : "preview-only"}`}>
          <nav className="site-nav"><div className="site-brand">{content.brand}</div><div className="nav-links"><span>Počni ovde</span><span>AI alati</span><span>Radni alati</span><span>Biblioteka rešenja</span><span>Svi proizvodi</span><details className="nav-more"><summary>Više <span aria-hidden="true">⌄</span></summary><div className="nav-dropdown"><span>Sistem</span><span>Blog</span><span>O meni</span><span>1 na 1</span><span>Česta pitanja</span></div></details></div></nav>
          <section className="hero"><div className="hero-copy">{editable("eyebrow","eyebrow",content.eyebrow)}{editable("headline","hero-title",content.headline.split(/(glas)/i).map((part, i) => part.toLowerCase() === "glas" ? <em key={i} className="feminine-word">{part}</em> : part))}{editable("description","hero-description",content.description)}<button className={`hero-cta editable ${selected === "button" && editing ? "chosen" : ""}`} onClick={() => select("button")}>{selected === "button" && editing && <span className="selection-label">DUGME</span>}{content.button}<ArrowUpRight size={16}/></button><div className="hero-caption"><span className="caption-line"/> PROSTOR ZA IDEJE. SISTEM ZA RAST.</div></div>
          <div className={`hero-image editable ${selected === "image" && editing ? "chosen" : ""}`} onClick={() => { if (editing) { setSelected("image"); uploadRef.current?.click(); } }}>{content.image ? <img src={content.image} alt="Izabrana fotografija za pregled"/> : <div className="image-placeholder"><div className="image-placeholder-icon"><ImagePlus size={25}/></div><strong>Umetni svoju fotografiju</strong><span>Klikni ovde da izabereš sliku</span></div>}{selected === "image" && editing && <span className="selection-label image-label">FOTOGRAFIJA · KLIKNI DA ZAMENIŠ</span>}</div></section>
          <section className="below-fold"><span className="below-kicker">JEDNO MESTO · VIŠE MOGUĆNOSTI</span><h2>Od ideje do sistema koji radi za tebe</h2><p>Ovo je primer rasporeda. Kasnije ćemo povezati stvarne sekcije postojećeg sajta</p></section>
        </div></div>
      </main>
      <aside className="right-panel"><div className="inspector-heading"><div><span className="panel-kicker">SVOJSTVA</span><h2>Uredi element</h2></div><Pencil size={18}/></div>
        {selected === "image" ? <div className="inspector-content"><label className="field-label">Fotografija</label><div className="inspector-image">{content.image ? <img src={content.image} alt="Pregled izabrane slike"/> : <div className="empty-image"><ImagePlus size={23}/><span>Nije izabrana slika</span></div>}</div><button className="button button-primary full-width" onClick={() => uploadRef.current?.click()}><Upload size={16}/> {content.image ? "Zameni sliku" : "Umetni sliku"}</button>{content.image && <button className="text-button danger" onClick={() => update("image","")}><X size={14}/> Ukloni sliku</button>}<div className="field-help">Slika je trenutno samo za lokalni pregled. Kasnije ćemo povezati trajno skladištenje.</div></div>
        : <div className="inspector-content"><label className="field-label" htmlFor="selected-value">{fields.find(f => f.key === selected)?.label || "Tekst"}</label>{selected === "description" ? <textarea id="selected-value" value={content[selected]} onChange={e => update(selected,e.target.value)} rows={5}/> : <input id="selected-value" value={content[selected] || ""} onChange={e => update(selected,e.target.value)}/>}<div className="field-help">Izmene se prikazuju odmah u pregledu. Sačuvaj nacrt kada budeš zadovoljna.</div><div className="inspector-divider"/><label className="field-label">Stanje elementa</label><div className="status-card"><Check size={16}/><span>Izmena je ograničena na izabrani element.</span></div></div>}
        <div className="right-bottom"><div className="security-card"><div className="security-icon"><Eye size={17}/></div><div><strong>Bezbedno uređivanje</strong><p>Objavljeni sajt nije povezan sa ovim prototipom.</p></div></div><button className="button button-primary full-width" onClick={saveDraft}><Save size={16}/> Sačuvaj nacrt</button>{saveNotice && <div className="status-card save-confirmation"><Check size={16}/><span>{saveNotice}</span></div>}{error && <p className="error-message">{error}</p>}<div className="publish-note"><span className="note-dot"/> Objavljivanje nije uključeno u prototip.</div></div>
      </aside>
    </div>
  </div>;
}
