import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Eye, ImagePlus, LayoutTemplate, Monitor, Pencil, Save, Smartphone, Tablet, Type, Undo2, Upload, X } from "lucide-react";

const initial = {
  brand: "Marijana Digital Soul",
  topTitle: "Biblioteka rešenja",
  topSubtitle: "Digitalni proizvodi, alati i praktična rešenja za lakši, organizovaniji i ispunjeniji život.",
  topQuote: "",
  marketingMockup: "",
  driveMockup: "",
  freeGuideImage: "",
  freeTemplateImage: "",
  freeChecklistImage: "",
  freeAIImage: "",  eyebrow: "DIGITALNI ALATI · JEDNOSTAVNI SISTEMI",
  headline: "Tvoja ideja, tvoj glas, tvoj sistem",
  description: "Mesto za digitalne proizvode, pametne alate i sisteme koji ti pomažu da organizuješ ideje i razvijaš online posao",
  button: "Istraži biblioteku",
  image: ""
};
const DRAFT_KEY = "digital-soul-editor-draft-v2";
const openDraftDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open("digital-soul-editor-storage", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("drafts");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const readStoredDraft = async () => {
  const db = await openDraftDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction("drafts", "readonly").objectStore("drafts").get(DRAFT_KEY);
    request.onsuccess = () => { db.close(); resolve(request.result || null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
};
const writeStoredDraft = async (value) => {
  const db = await openDraftDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").put(value, DRAFT_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Čuvanje je prekinuto")); };
  });
};
const fields = [
  { key: "topTitle", label: "Gornji naslov" },
  { key: "topSubtitle", label: "Gornji podnaslov" },
  { key: "topQuote", label: "Citat za Biblioteku rešenja (opciono)" },
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
  const marketingUploadRef = useRef(null);
  const driveUploadRef = useRef(null);
  const freeGuideRef = useRef(null);
  const freeTemplateRef = useRef(null);
  const freeChecklistRef = useRef(null);
  const freeAIRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const draft = await readStoredDraft();
        if (active && draft) {
          const parsed = { ...initial, ...draft };
          setContent(parsed); setSaved(parsed); setStatus("Učitan lokalni nacrt");
        } else if (active) {
          const legacy = localStorage.getItem("digital-soul-editor-draft");
          if (legacy) {
            const parsed = { ...initial, ...JSON.parse(legacy) };
            setContent(parsed); setSaved(parsed); setStatus("Učitan raniji lokalni nacrt");
          }
        }
      } catch {
        if (active) setStatus("Novi nacrt");
      }
    })();
    return () => { active = false; };
  }, []);

  const update = (key, value) => {
    setContent(current => ({ ...current, [key]: value }));
    setStatus("Nesačuvane izmene");
  };
  const saveDraft = async () => {
    setSaveNotice(""); setError(""); setStatus("Čuvanje nacrta…");
    try {
      await writeStoredDraft(content);
      setSaved(content); setStatus("Nacrt sačuvan na ovom uređaju");
      setSaveNotice("Nacrt i fotografija sačuvani su u ovom pregledaču. Javni sajt nije promenjen.");
    } catch (e) {
      setStatus("Nije moguće sačuvati nacrt");
      setError("Čuvanje nije uspelo. Proveri slobodan prostor u pregledaču ili pokušaj sa manjom fotografijom.");
    }
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
  const chooseMockup = (event, key) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Izaberi datoteku slike."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Za prototip izaberi sliku manju od 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { update(key, String(reader.result)); setError(""); };
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
          <section className="hero"><div className="hero-copy">{editable("eyebrow","eyebrow",content.eyebrow)}{editable("headline","hero-title",content.headline.split(/(glas)/i).map((part, i) => part.toLowerCase() === "glas" ? <em key={i} className="feminine-word">{part}</em> : part))}{editable("description","hero-description",content.description)}<div className="hero-actions"><button className={`hero-cta hero-cta-primary editable ${selected === "button" && editing ? "chosen" : ""}`} onClick={() => select("button")}>{selected === "button" && editing && <span className="selection-label">DUGME 1</span>}{content.button || "Počni ovde"}<ArrowUpRight size={16}/></button><button className="hero-cta hero-cta-secondary" type="button">Blog<ArrowUpRight size={16}/></button></div><div className="hero-caption"><span className="caption-line"/> PROSTOR ZA IDEJE. SISTEM ZA RAST.</div></div>
          <div className={`hero-image editable ${selected === "image" && editing ? "chosen" : ""}`} onClick={() => { if (editing) { setSelected("image"); uploadRef.current?.click(); } }}>{content.image ? <img src={content.image} alt="Izabrana fotografija za pregled"/> : <div className="image-placeholder"><div className="image-placeholder-icon"><ImagePlus size={25}/></div><strong>Umetni svoju fotografiju</strong><span>Klikni ovde da izabereš sliku</span></div>}{selected === "image" && editing && <span className="selection-label image-label">FOTOGRAFIJA · KLIKNI DA ZAMENIŠ</span>}</div></section>
          <section className="about-section">
            <div className="about-inner">
              <div className="about-copy">
                <span className="about-eyebrow">ZDRAVO, JA SAM MARIJANA</span>
                <h2>Pomažem ti da izgradiš posao u kome se osećaš <em>rasterećeno</em></h2>
                <p>Radim na digitalnim proizvodima, veštačkoj inteligenciji, marketingu i jednostavnim sistemima koji ljudima pomažu da organizuju svoj rad i razvijaju online poslovanje</p>
                <button className="about-button" type="button">Pročitaj o meni <ArrowUpRight size={16}/></button>
              </div>
              <div className="about-photo-wrap">
                <img className="about-photo" src="https://raw.githubusercontent.com/marijanaforai-creator/digital-soul-visual-editor/main/Monohromni%20portret%20%C5%BEene%20sa%20tabletima.png" alt="Crno-beli portret za sekciju O meni" />
              </div>
            </div>
          </section>
          <section className="mockup-cards">
            <article className="mockup-card marketing-card">
              <div className="mockup-image-area">
                {content.marketingMockup ? <img src={content.marketingMockup} alt="Marketing AI Sistem mockup"/> : <button className="mockup-upload-placeholder" onClick={() => marketingUploadRef.current?.click()}><ImagePlus size={28}/><strong>Dodaj mockup</strong><span>Marketing AI Sistem</span></button>}
              </div>
              <input ref={marketingUploadRef} type="file" accept="image/*" hidden onChange={e => chooseMockup(e,"marketingMockup")}/>
              <div className="mockup-copy">
                <span className="mockup-kicker">MARKETING · AI · PRODAJA</span>
                <h2>Marketing AI Sistem</h2>
                <h3>Pametniji marketing, povezani alati. Organizovana prodaja.</h3>
                <p>Kratko objašnjenje dodajemo kada budeš spremna.</p>
                {content.marketingMockup && <button className="mockup-change" onClick={() => marketingUploadRef.current?.click()}>Zameni mockup</button>}
              </div>
            </article>
            <article className="mockup-card drive-card">
              <div className="mockup-image-area">
                {content.driveMockup ? <img src={content.driveMockup} alt="Digital Soul Drive mockup"/> : <button className="mockup-upload-placeholder" onClick={() => driveUploadRef.current?.click()}><ImagePlus size={28}/><strong>Dodaj mockup</strong><span>Digital Soul Drive</span></button>}
              </div>
              <input ref={driveUploadRef} type="file" accept="image/*" hidden onChange={e => chooseMockup(e,"driveMockup")}/>
              <div className="mockup-copy">
                <span className="mockup-kicker">DIGITALNI SISTEM</span>
                <h2>Digital Soul Drive</h2>
                <h3>Upoznajte Digital Soul Drive</h3>
                <p>Opis ćemo dodati kada ga zajedno razradimo.</p>
                {content.driveMockup && <button className="mockup-change" onClick={() => driveUploadRef.current?.click()}>Zameni mockup</button>}
              </div>
            </article>
          </section>
                    <section className="library-section">
            <div className="library-hero">
              <div className="library-hero-copy">
                <span className="library-kicker">TVOJ PROSTOR ZA RAZVOJ I STVARANJE</span>
                {editable("topTitle","intro-title",content.topTitle || "Biblioteka rešenja")}
                {editable("topSubtitle","intro-subtitle",content.topSubtitle || "Dodaj podnaslov")}
                {editable("topQuote","intro-quote",content.topQuote || "Ovde ćeš dodati svoj citat")}
              </div>
              <div className="library-hero-art" aria-hidden="true">
                <div className="library-art-glow"></div><div className="library-art-plant">✿</div>
                <div className="library-art-books"><span></span><span></span><span></span></div>
                <div className="library-art-laptop"><div className="library-art-screen"><span className="library-art-logo">✧</span><span>Marijana<br/>Digital Soul</span></div><div className="library-art-base"></div></div>
                <div className="library-art-mug">✧</div>
              </div>
            </div>
            <div className="library-grid">
              <article className="library-card library-women"><div className="library-card-art"><span className="library-art-symbol">✿</span><span className="library-art-label">lični razvoj · ravnoteža</span></div><div className="library-card-copy"><span className="library-number">01</span><h2>Ženski programi</h2><p>Alati, vodiči i sadržaji za svakodnevni život, lični razvoj i više ravnoteže.</p><button type="button">Istraži programe <ArrowUpRight size={15}/></button></div></article>
              <article className="library-card library-teen"><div className="library-card-art"><span className="library-art-symbol">✧</span><span className="library-art-label">učenje · kreativnost</span></div><div className="library-card-copy"><span className="library-number">02</span><h2>Tinejdžerski i dečji programi</h2><p>Materijali i programi prilagođeni mladima i njihovim potrebama.</p><button type="button">Pogledaj sadržaje <ArrowUpRight size={15}/></button></div></article>
              <article className="library-card library-templates"><div className="library-card-art"><span className="library-art-symbol">▤</span><span className="library-art-label">planeri · radni listovi</span></div><div className="library-card-copy"><span className="library-number">03</span><h2>Gotovi šabloni</h2><p>Praktični šabloni, planeri i radni listovi koje možeš odmah preuzeti i koristiti.</p><button type="button">Pogledaj šablone <ArrowUpRight size={15}/></button></div></article>
              <article className="library-card library-products"><div className="library-card-art"><span className="library-art-symbol">✧</span><span className="library-art-label">e-knjige · vodiči · paketi</span></div><div className="library-card-copy"><span className="library-number">04</span><h2>Digitalni proizvodi</h2><p>E-knjige, vodiči, paketi i druga digitalna rešenja za lični i poslovni razvoj.</p><button type="button">Otkrij proizvode <ArrowUpRight size={15}/></button></div></article>
              <article className="library-card library-marketing"><div className="library-card-art"><span className="library-art-symbol">↗</span><span className="library-art-label">marketing · sistemi · alati</span></div><div className="library-card-copy"><span className="library-number">05</span><h2>Marketing programi</h2><p>Praktični sistemi, alati i strategije za organizovan marketing i prodaju digitalnih proizvoda.</p><button type="button">Pogledaj programe <ArrowUpRight size={15}/></button></div></article>
              <article className="library-card library-partners"><div className="library-card-art"><span className="library-art-symbol">∞</span><span className="library-art-label">saradnja · mogućnosti</span></div><div className="library-card-copy"><span className="library-number">06</span><h2>Partnerski programi</h2><p>Resursi i mogućnosti za partnersku saradnju.</p><button type="button">Saznaj više <ArrowUpRight size={15}/></button></div></article>
            </div>
          </section>

          <section className="blog-section">
            <div className="blog-section-heading">
              <span className="library-kicker">IDEJE · ZNANJE · INSPIRACIJA</span>
              <h2>Blog</h2>
              <p>Tekstovi i praktične ideje koje ti pomažu da napraviš sledeći korak.</p>
            </div>
            <div className="blog-editor-placeholder">
              <div className="blog-placeholder-art"><span>✎</span></div>
              <div className="blog-placeholder-copy"><span className="library-number">BLOG STUDIO</span><h3>Prostor za tvoje tekstove</h3><p>Ovde ćemo dodati blog članke, njihove naslovne slike, kratke opise i dugme za čitanje. Sadržaj ćemo zajedno razraditi kasnije.</p></div>
            </div>
          </section>
          <section className="free-content-section">
            <div className="free-content-heading"><span className="library-kicker">BESPLATNI SADRŽAJ</span><h2>Uzmi ono što ti može pomoći odmah</h2></div>
            <div className="free-content-grid">
              <article className="free-content-card"><button type="button" className="free-content-image" onClick={() => freeGuideRef.current?.click()}>{content.freeGuideImage ? <img src={content.freeGuideImage} alt="Mockup besplatnih vodiča"/> : <><ImagePlus size={25}/><strong>Dodaj sliku ili mockup</strong></>}</button><input ref={freeGuideRef} type="file" accept="image/*" hidden onChange={e => chooseMockup(e,"freeGuideImage")}/><div className="free-content-copy"><span>01</span><h3>Besplatni vodiči</h3><p>Jasne upute za konkretne probleme i zadatke</p>{content.freeGuideImage && <button type="button" onClick={() => freeGuideRef.current?.click()}>Zameni sliku</button>}</div></article>
              <article className="free-content-card"><button type="button" className="free-content-image" onClick={() => freeTemplateRef.current?.click()}>{content.freeTemplateImage ? <img src={content.freeTemplateImage} alt="Mockup besplatnih šablona"/> : <><ImagePlus size={25}/><strong>Dodaj sliku ili mockup</strong></>}</button><input ref={freeTemplateRef} type="file" accept="image/*" hidden onChange={e => chooseMockup(e,"freeTemplateImage")}/><div className="free-content-copy"><span>02</span><h3>Besplatni šabloni</h3><p>Gotove strukture za lakši početak</p>{content.freeTemplateImage && <button type="button" onClick={() => freeTemplateRef.current?.click()}>Zameni sliku</button>}</div></article>
              <article className="free-content-card"><button type="button" className="free-content-image" onClick={() => freeChecklistRef.current?.click()}>{content.freeChecklistImage ? <img src={content.freeChecklistImage} alt="Mockup besplatnih kontrolnih lista"/> : <><ImagePlus size={25}/><strong>Dodaj sliku ili mockup</strong></>}</button><input ref={freeChecklistRef} type="file" accept="image/*" hidden onChange={e => chooseMockup(e,"freeChecklistImage")}/><div className="free-content-copy"><span>03</span><h3>Besplatne kontrolne liste</h3><p>Koraci koje možeš pratiti bez komplikovanja</p>{content.freeChecklistImage && <button type="button" onClick={() => freeChecklistRef.current?.click()}>Zameni sliku</button>}</div></article>
              <article className="free-content-card"><button type="button" className="free-content-image" onClick={() => freeAIRef.current?.click()}>{content.freeAIImage ? <img src={content.freeAIImage} alt="Mockup besplatnih AI materijala"/> : <><ImagePlus size={25}/><strong>Dodaj sliku ili mockup</strong></>}</button><input ref={freeAIRef} type="file" accept="image/*" hidden onChange={e => chooseMockup(e,"freeAIImage")}/><div className="free-content-copy"><span>04</span><h3>Besplatni AI materijali</h3><p>Upiti, ideje i praktični AI resursi</p>{content.freeAIImage && <button type="button" onClick={() => freeAIRef.current?.click()}>Zameni sliku</button>}</div></article>
            </div>
          </section>


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
