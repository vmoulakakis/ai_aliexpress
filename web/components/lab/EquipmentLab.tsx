'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CHECKED_AT, equipment, missions, getMission, type MissionId, type Tier } from '../../lib/lab/catalog';
import { createPlan, exportPlan, matchMission, readSaved, type PlanInput, type SavedPlan } from '../../lib/lab/planner';
import s from './lab.module.css';

const currency = (value: number) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
const STORAGE_KEY = 'found.lab.plan.v1';
const DEFAULT: PlanInput = { mission: 'robotics', tier: 'starter', budget: 5000, existingTraining: false, contingency: 15 };
function Arrow({ diagonal = false }: { diagonal?: boolean }) { return <span aria-hidden="true">{diagonal ? '↗' : '→'}</span>; }
function LabDrawing({ mission }: { mission: MissionId }) {
  return <svg viewBox="0 0 620 490" role="img" aria-label="Σχηματική απεικόνιση εργαστηρίου με ρομποτικό βραχίονα και υπολογιστή. Δεν απεικονίζει συγκεκριμένο προϊόν." className={s.drawing}>
    <defs><linearGradient id="lab-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eef1e9"/><stop offset=".48" stopColor="#a4b4a6"/><stop offset="1" stopColor="#576f61"/></linearGradient><linearGradient id="lab-base" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#728a78"/><stop offset="1" stopColor="#233b30"/></linearGradient><pattern id="lab-grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 34" fill="none" stroke="#aac3aa" strokeWidth=".55" opacity=".22"/></pattern></defs>
    <rect width="620" height="490" fill="url(#lab-grid)"/>
    <ellipse cx="315" cy="368" rx="242" ry="68" fill="#061a13" opacity=".55"/>
    <path d="M52 364 300 258 566 360 318 466Z" fill="#263c31" stroke="#647f69"/>
    <path d="M52 364v13l266 102 248-106v-13L318 466Z" fill="#172c23" stroke="#4c6757"/>
    <g className={mission === 'local' ? s.highlight : undefined}>
      <path d="m351 302 100-40 75 30-100 41Z" fill="#d4dccd" stroke="#a5b7a6"/>
      <path d="m351 302 75 31v77l-75-31Z" fill="url(#lab-base)" stroke="#7b9480"/>
      <path d="m426 333 100-41v77l-100 41Z" fill="#182f25" stroke="#77917d"/>
      {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${434 + i * 8} ${338 - i * 3.3}v52`} stroke="#6b846f" strokeWidth="2"/>)}
      <path d="m365 334 43 17m-43-6 43 17m-43-6 43 17" stroke="#aec3a9" strokeWidth="2"/>
      <circle cx="367" cy="370" r="3" fill="#c9ed78"/>
    </g>
    <g className={mission === 'robotics' ? s.highlight : undefined}>
      <ellipse cx="213" cy="354" rx="63" ry="23" fill="#78917b" stroke="#b4c4ad"/>
      <path d="M150 337v17c0 29 126 29 126 0v-17" fill="url(#lab-base)" stroke="#a4b79f"/>
      <ellipse cx="213" cy="337" rx="63" ry="23" fill="url(#lab-metal)"/>
      <path d="M193 325v-51l39-5 5 56" fill="url(#lab-metal)" stroke="#d1dcc8"/>
      <path d="m203 280-63-95 25-22 68 101" fill="url(#lab-metal)" stroke="#d1dcc8"/>
      <circle cx="154" cy="176" r="24" fill="#66836c" stroke="#bdceb4" strokeWidth="5"/>
      <circle cx="154" cy="176" r="11" fill="#213f2f" stroke="#c9ed78" strokeWidth="2"/>
      <path d="m160 153 111-53 16 30-116 58" fill="url(#lab-metal)" stroke="#d1dcc8"/>
      <circle cx="282" cy="115" r="22" fill="#718a70" stroke="#c1d0b6" strokeWidth="4"/>
      <circle cx="282" cy="115" r="9" fill="#213f2f" stroke="#c9ed78" strokeWidth="2"/>
      <path d="m298 112 39 45-17 16-44-45" fill="url(#lab-metal)" stroke="#d1dcc8"/>
      <path d="m328 158 17 5 12 22-9 25m-20-52-6 22 12 22 21 7" fill="none" stroke="#c7d3be" strokeWidth="9" strokeLinejoin="round"/>
      <path d="M204 284 129 178 283 91 338 157" fill="none" stroke="#1b3829" strokeWidth="5"/>
      <circle cx="216" cy="277" r="20" fill="#638168" stroke="#c7d3be" strokeWidth="5"/><circle cx="216" cy="277" r="8" fill="#233c2d"/>
    </g>
    <g className={mission === 'vision' ? s.highlight : undefined}>
      <path d="m88 276 43-17v-77l-43 17Z" fill="#a7b99d" stroke="#dce5d5"/>
      <path d="m88 199-19-9 44-16 18 8Z" fill="#d9e3d1"/><path d="M69 190v75l19 11v-77Z" fill="#6f8d73"/>
      <circle cx="108" cy="218" r="12" fill="#14392a" stroke="#c9ed78" strokeWidth="3"/>
      <path d="M110 267v38l-30 12 30 12 32-12-32-12" fill="none" stroke="#9ab492" strokeWidth="6"/>
      <path d="m125 222 186 92-39 24Z" fill="#c9ed78" opacity={mission === 'vision' ? '.2' : '.05'}/>
    </g>
    <path d="M250 355 300 375l53-24" fill="none" stroke="#c9ed78" strokeWidth="2" strokeDasharray="4 6"/>
    <g fill="#dbe6d0" fontFamily="monospace" fontSize="10" letterSpacing="1"><text x="38" y="61">PHYSICAL × LOCAL AI</text><text x="378" y="452">CONCEPT / LAB BENCH</text></g>
    <g fill="none" stroke="#c9ed78" strokeWidth="1" opacity=".65"><path d="M345 95h109v105M340 91l5 4-5 4M456 203l-2-4-2 4"/><path d="M80 375 64 404h110"/></g>
  </svg>;
}

export default function EquipmentLab() {
  const [input, setInput] = useState<PlanInput>(DEFAULT);
  const [goal, setGoal] = useState(getMission(DEFAULT.mission).goal);
  const [query, setQuery] = useState('');
  const [matchError, setMatchError] = useState('');
  const [formError, setFormError] = useState('');
  const [invalidField, setInvalidField] = useState<'goal' | 'budget' | 'reserve' | null>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [compare, setCompare] = useState(false);
  const [saved, setSaved] = useState<SavedPlan | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const budgetRef = useRef<HTMLInputElement>(null);
  const mission = getMission(input.mission);
  const plan = useMemo(() => { try { return createPlan(input); } catch { return null; } }, [input]);

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = 'el';
    const params = new URLSearchParams(window.location.search);
    const selected = params.get('mission'); const tier = params.get('tier');
    if (missions.some(m => m.id === selected)) {
      const next = { ...DEFAULT, mission: selected as MissionId, tier: tier === 'advanced' ? 'advanced' as Tier : 'starter' as Tier };
      setInput(next); setGoal(getMission(selected).goal); setHasPlan(params.get('plan') === '1');
    }
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setSaved(readSaved(JSON.parse(raw))); } catch { /* blocked storage is handled on save */ }
    return () => { document.documentElement.lang = previous; };
  }, []);

  function selectMission(id: MissionId, scroll = true) {
    setInput(prev => ({ ...prev, mission: id, allowances: undefined })); setGoal(getMission(id).goal);
    setHasPlan(false); setFormError(''); setInvalidField(null); setMatchError('');
    if (scroll) document.getElementById('lab-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function findStartingPoint(event: FormEvent) {
    event.preventDefault();
    const match = matchMission(query);
    if (!match) { setMatchError('Δεν βρέθηκε σαφής αντιστοίχιση στα 3 διαθέσιμα σενάρια. Δοκίμασε «τοπικό AI», «ρομποτικός βραχίονας» ή «οπτικός έλεγχος».'); queryRef.current?.focus(); return; }
    selectMission(match); setGoal(query.trim()); setNotice('Επιλέχθηκε αφετηρία από τον επιμελημένο κατάλογο. Προσαρμόστε το πλάνο παρακάτω.');
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!goal.trim() || goal.length > 750) { setFormError('Περιέγραψε τον στόχο σου με 1 έως 750 χαρακτήρες.'); setInvalidField('goal'); document.getElementById('lab-goal')?.focus(); return; }
    try { createPlan(input); } catch (error) { setFormError((error as Error).message); const field = Number.isFinite(input.budget) && input.budget >= 100 && input.budget <= 100000 ? 'reserve' : 'budget'; setInvalidField(field); document.getElementById('lab-' + field)?.focus(); return; }
    setFormError(''); setInvalidField(null); setHasPlan(true);
    const params = new URLSearchParams({ mission: input.mission, tier: input.tier, plan: '1' });
    window.history.replaceState(null, '', `${window.location.pathname}?${params}#lab-result`);
    window.requestAnimationFrame(() => { resultRef.current?.focus({ preventScroll: true }); document.getElementById('lab-result')?.scrollIntoView({ behavior: 'smooth' }); });
  }
  function savePlan() {
    const value: SavedPlan = { version: 1, input, goal, savedAt: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); setSaved(value); setNotice('Το πλάνο αποθηκεύτηκε σε αυτό το πρόγραμμα περιήγησης. Δεν στάλθηκε σε διακομιστή.'); }
    catch { setNotice('Η αποθήκευση στο πρόγραμμα περιήγησης δεν επιτρέπεται. Κατέβασε το CSV για να κρατήσεις το πλάνο.'); }
  }
  function loadSaved() {
    if (!saved) return;
    setInput(saved.input); setGoal(saved.goal); setHasPlan(true); setSavedOpen(false);
    setNotice('Το αποθηκευμένο πλάνο φορτώθηκε. Οι τιμές και η διαθεσιμότητα χρειάζονται νέο έλεγχο.');
    window.requestAnimationFrame(() => { document.getElementById('lab-result')?.scrollIntoView({ behavior: 'smooth' }); resultRef.current?.focus({ preventScroll: true }); });
  }
  function download() {
    const csv = exportPlan(input, goal);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `found-lab-${input.mission}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Το πλάνο εξήχθη σε CSV. Περιλαμβάνει τις προβλέψεις, τις πηγές και τις εκκρεμότητες.');
  }
  async function share() {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('mission', input.mission); url.searchParams.set('tier', input.tier);
    try { await navigator.clipboard.writeText(url.toString()); setNotice('Αντιγράφηκε σύνδεσμος της αφετηρίας. Δεν περιλαμβάνει προσωπικό στόχο ή προϋπολογισμό.'); }
    catch { setNotice('Δεν επιτρέπεται η αντιγραφή. Χρησιμοποίησε το CSV για μεταφορά ολόκληρου του πλάνου.'); }
  }
  function update(patch: Partial<PlanInput>) { setInput(prev => ({ ...prev, ...patch })); setFormError(''); setInvalidField(null); }

  return <main className={s.lab} lang="el">
    <a className={s.skip} href="#lab-builder">Μετάβαση στον σχεδιαστή</a>
    <header className={s.nav}>
      <Link href="/" className={s.brand} aria-label="FOUND αρχική">FOUND<span>.</span><small>LAB</small></Link>
      <nav aria-label="Πλοήγηση εργαστηρίου"><a href="#lab-missions">Εφαρμογές</a><a href="#lab-builder">Σχεδιαστής</a><a href="#lab-evidence">Η μέθοδός μας</a></nav>
      <button className={s.savedButton} type="button" aria-expanded={savedOpen} aria-controls="lab-saved" onClick={() => setSavedOpen(!savedOpen)}><span aria-hidden="true">▱</span> Το πλάνο μου <span className={s.count}>{saved ? 1 : 0}</span></button>
    </header>
    {savedOpen && <section id="lab-saved" className={s.savedPanel} aria-label="Αποθηκευμένο πλάνο"><div><strong>{saved ? getMission(saved.input.mission).label : 'Το πρώτο σου πλάνο ξεκινά εδώ.'}</strong><p>{saved ? 'Αποθηκευμένο μόνο σε αυτό το πρόγραμμα περιήγησης.' : 'Διάλεξε εφαρμογή, φτιάξε πλάνο και αποθήκευσέ το στη συσκευή σου.'}</p></div>{saved && <button type="button" className={s.darkButton} onClick={loadSaved}>Άνοιγμα πλάνου <Arrow/></button>}<button type="button" className={s.textButton} onClick={() => setSavedOpen(false)}>Κλείσιμο ×</button></section>}

    <section className={s.hero}>
      <div className={s.heroCopy}><div className={s.eyebrow}><span className={s.dot}/> PHYSICAL AI · LOCAL COMPUTE</div>
        <h1>Η ιδέα σου.<br/>Το επόμενο<br/><em>εργαστήριό σου.</em></h1>
        <p className={s.lead}>Από ένα μοντέλο στον υπολογιστή σου, μέχρι έναν βραχίονα που μαθαίνει. Βρες την αφετηρία, τον εξοπλισμό και τα επόμενα βήματα.</p>
        <a href="#lab-builder" className={s.darkButton}>Σχεδίασε το σύστημά σου <Arrow/></a>
        <div className={s.heroFoot}><span>Πηγές δίπλα σε κάθε επιλογή</span><span>Προϋπολογισμός που ελέγχεις</span></div>
      </div>
      <div className={s.visual}><div className={s.visualHead}><span>THE EQUIPMENT WORKSPACE</span><span className={s.visualBadge}>MVP / GR</span></div><LabDrawing mission={input.mission}/><div className={s.visualFoot}><div><span>ΕΞΕΡΕΥΝΗΣΗ ΣΥΣΤΗΜΑΤΟΣ</span><strong>{mission.label}</strong></div><span>Σχηματική απεικόνιση<br/>όχι συγκεκριμένο προϊόν</span></div></div>
    </section>
    <div className={s.strip}><span>ROBOTICS</span><i>×</i><span>EDGE AI</span><i>×</i><span>LOCAL MODELS</span><i>×</i><span>HARDWARE THAT FITS YOUR IDEA</span></div>

    <section id="lab-missions" className={s.missions}>
      <div className={s.sectionIntro}><div><p className={s.eyebrow}>ΞΕΚΙΝΑ ΑΠΟ ΤΗΝ ΕΡΓΑΣΙΑ</p><h2>Τι θέλεις να<br/><em>κάνεις δυνατό;</em></h2></div><p>Τρεις αφετηρίες για να περάσεις από την αναζήτηση εξαρτημάτων σε ένα συγκεκριμένο πλάνο.</p></div>
      <div className={s.missionList}>{missions.map(m => <button type="button" key={m.id} onClick={() => selectMission(m.id)} className={`${s.missionRow} ${input.mission === m.id ? s.missionActive : ''}`}><span className={s.missionLabel}>{m.label}</span><span className={s.missionText}><strong>{m.title}</strong><span>{m.description}</span></span><span className={s.roundArrow}><Arrow diagonal/></span></button>)}</div>
    </section>

    <section id="lab-builder" className={s.builder} aria-labelledby="builder-title">
      <div className={s.builderIntro}><p className={s.eyebrow}>ΤΟ ΔΙΚΟ ΣΟΥ SETUP</p><h2 id="builder-title">Μια ιδέα.<br/><em>Ένα πλάνο.</em></h2><p>Διάλεξε αφετηρία και προσαρμόσε τις παραδοχές σου. Ο σχεδιαστής χρησιμοποιεί επιμελημένα σενάρια και τοπικούς υπολογισμούς.</p><div className={s.methodNote}><span aria-hidden="true">◇</span><p><strong>Πρώτα η τεκμηρίωση.</strong>Η ελεύθερη ανάλυση με μοντέλο AI δεν έχει συνδεθεί σε αυτή την έκδοση. Οι παρακάτω προτάσεις είναι σενάρια σχεδιασμού.</p></div></div>
      <div className={s.builderForm}>
        <form noValidate onSubmit={findStartingPoint} className={s.matchForm}><label htmlFor="lab-query">Δεν ξέρεις από πού να ξεκινήσεις;</label><div><textarea className="resize-none" id="lab-query" ref={queryRef} rows={2} maxLength={750} value={query} onChange={e => { setQuery(e.target.value); setMatchError(''); }} placeholder="π.χ. Θέλω έναν ρομποτικό βραχίονα για εκπαίδευση" aria-invalid={!!matchError} aria-describedby={matchError ? 'lab-match-error' : 'lab-match-hint'} style={{ resize: 'none' }}/>{query && <button className={s.clear} type="button" aria-label="Καθαρισμός αναζήτησης" onClick={() => { setQuery(''); setMatchError(''); queryRef.current?.focus(); }}>×</button>}</div><button className={s.textButton} type="submit">Βρες αφετηρία <Arrow/></button><small id="lab-match-hint">Αντιστοίχιση λέξεων στα 3 σενάρια · το κείμενο μένει στη συσκευή σου</small>{matchError && <p id="lab-match-error" role="alert" className={s.error}>{matchError}</p>}</form>
        <form noValidate onSubmit={submit}>
          <fieldset className={s.fieldset}><legend>Εφαρμογή</legend><div className={s.segmented}>{missions.map(m => <label key={m.id} className={input.mission === m.id ? s.selected : ''}><input type="radio" name="mission" value={m.id} checked={input.mission === m.id} onChange={() => selectMission(m.id, false)}/><span>{m.label}</span></label>)}</div></fieldset>
          <div className={s.field}><label htmlFor="lab-goal">Τι θέλεις να πετύχεις;</label><textarea className="resize-none" id="lab-goal" rows={3} maxLength={750} value={goal} onChange={e => { setGoal(e.target.value); setFormError(''); setInvalidField(null); }} aria-invalid={invalidField === 'goal'} aria-describedby={invalidField === 'goal' ? 'lab-goal-hint lab-form-error' : 'lab-goal-hint'} style={{ resize: 'none' }}/><small id="lab-goal-hint">Ο στόχος συνοδεύει το πλάνο σου. Δεν αλλάζει αυτόματα την επιλεγμένη διαμόρφωση.</small></div>
          <fieldset className={s.fieldset}><legend>Επίπεδο εξοπλισμού</legend><div className={s.segmented}>{([{ id: 'starter', label: 'Πρώτο πείραμα' }, { id: 'advanced', label: 'Περισσότερη υπολογιστική ισχύς' }] as const).map(t => <label key={t.id} className={input.tier === t.id ? s.selected : ''}><input type="radio" name="tier" checked={input.tier === t.id} onChange={() => update({ tier: t.id, allowances: undefined })}/><span>{t.label}</span></label>)}</div></fieldset>
          <div className={s.inputGrid}><div className={s.field}><label htmlFor="lab-budget">Συνολικός προϋπολογισμός (€)</label><input id="lab-budget" type="number" min="100" max="100000" step="100" ref={budgetRef} value={Number.isNaN(input.budget) ? '' : input.budget} onChange={e => update({ budget: e.target.value === '' ? NaN : Number(e.target.value) })} aria-invalid={invalidField === 'budget'} aria-describedby={invalidField === 'budget' ? 'lab-budget-hint lab-form-error' : 'lab-budget-hint'}/><small id="lab-budget-hint">Πρόβλεψη δαπάνης, μαζί με τυχόν φόρους και μεταφορικά.</small></div><div className={s.field}><label htmlFor="lab-reserve">Αποθεματικό (%)</label><input id="lab-reserve" aria-invalid={invalidField === 'reserve'} aria-describedby={invalidField === 'reserve' ? 'lab-form-error' : undefined} type="number" min="0" max="50" value={Number.isNaN(input.contingency) ? '' : input.contingency} onChange={e => update({ contingency: e.target.value === '' ? NaN : Number(e.target.value) })}/><small>Για πρόσθετα εξαρτήματα ή αλλαγές του σεναρίου.</small></div></div>
          {input.mission === 'robotics' && <label className={s.checkbox}><input type="checkbox" checked={input.existingTraining} onChange={e => update({ existingTraining: e.target.checked })}/><span>Έχω ήδη υπολογιστή εκπαίδευσης<small>Αφαιρεί το σχετικό κονδύλι. Η καταλληλότητά του χρειάζεται έλεγχο.</small></span></label>}
          {formError && <p id="lab-form-error" className={s.error} role="alert">{formError}</p>}
          <button className={s.darkButton} type="submit">Δημιουργία πλάνου <Arrow/></button>
          <p className={s.formFoot}>Χωρίς εγγραφή · Δεν γίνεται παραγγελία ή αποστολή αιτήματος</p>
        </form>
      </div>
    </section>

    {hasPlan && plan && <section id="lab-result" className={s.result} aria-labelledby="result-title">
      <div className={s.resultHead}><div><p className={s.eyebrow}>ΤΟ ΠΛΑΝΟ ΣΟΥ / {mission.label.toUpperCase()}</p><h2 id="result-title" ref={resultRef} tabIndex={-1}>{mission.title}</h2><p>{mission.outcome}</p></div><div className={s.resultActions}><button className={s.darkButton} type="button" onClick={savePlan}>Αποθήκευση στη συσκευή <span aria-hidden="true">＋</span></button><button className={s.outlineButton} type="button" onClick={download}>Εξαγωγή CSV <span aria-hidden="true">↓</span></button><button className={s.textButton} type="button" onClick={share}>Σύνδεσμος αφετηρίας <Arrow diagonal/></button></div></div>
      <div className={s.goalQuote}><span>Ο ΣΤΟΧΟΣ ΣΟΥ</span><p>{goal}</p></div>
      <div className={s.resultGrid}><div className={s.parts}><div className={s.partsHead}><h3>Τι περιλαμβάνει</h3><span>{plan.lines.length} ενότητες εξοπλισμού</span></div>{plan.lines.map((line, i) => <article className={s.part} key={line.id}><span className={s.partNumber}>{String(i + 1).padStart(2, '0')}</span><div><span className={s.partRole}>{line.role}</span><h4>{line.name}</h4><p>{line.facts[0]}</p><details><summary>Πηγές και περιορισμοί</summary><p>{line.caveat}</p><ul>{line.sources.length ? line.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <Arrow diagonal/></a></li>) : <li>Δεν έχει επιλεγεί συγκεκριμένο προϊόν ή προμηθευτής.</li>}</ul><small>{line.allowanceNote}</small></details></div><div className={s.allowance}><label htmlFor={`amount-${line.id}`}>Πρόβλεψη €</label><input id={`amount-${line.id}`} type="number" min="0" max="100000" step="10" value={line.amount} onChange={e => { const amount = Number(e.target.value); if (Number.isFinite(amount) && amount >= 0 && amount <= 100000) update({ allowances: { ...input.allowances, [line.id]: amount } }); }}/></div></article>)}<p className={s.partDisclaimer}>Οι προβλέψεις είναι επεξεργάσιμες παραδοχές σχεδιασμού, όχι τιμές πώλησης. Οι σύνδεσμοι προμηθευτών δεν αποδεικνύουν απόθεμα ή αποστολή.</p></div>
      <aside className={s.cost}><span className={s.eyebrow}>ΠΡΟΫΠΟΛΟΓΙΣΜΟΣ ΣΕΝΑΡΙΟΥ</span><strong className={s.total}>{currency(plan.total)}</strong><p>Ενδεικτική κατανομή · όχι προσφορά</p><dl><div><dt>Εξοπλισμός</dt><dd>{currency(plan.subtotal)}</dd></div><div><dt>Αποθεματικό {input.contingency}%</dt><dd>{currency(plan.reserve)}</dd></div><div><dt>Διαθέσιμο ποσό</dt><dd>{currency(input.budget)}</dd></div></dl><div className={`${s.budgetState} ${plan.withinBudget ? s.budgetOk : s.budgetOver}`} role="status"><strong>{plan.withinBudget ? 'Εντός του σεναρίου σου' : 'Το σενάριο ξεπερνά το όριό σου'}</strong><span>{plan.withinBudget ? 'Υπόλοιπο' : 'Υπέρβαση'} {currency(Math.abs(plan.remaining))}</span></div><p className={s.costNote}>ΦΠΑ, αποστολή στην Ελλάδα, εγκατάσταση και τελικές τιμές δεν έχουν επαληθευτεί. Προσαρμόσε κάθε κονδύλι μετά από πραγματική προσφορά.</p><button className={s.textButton} onClick={() => { setCompare(!compare); }} type="button" aria-expanded={compare} aria-controls="lab-compare">Σύγκριση υπολογιστών <span aria-hidden="true">{compare ? '−' : '+'}</span></button></aside></div>
      {compare && <section className={s.compare} id="lab-compare" aria-label="Σύγκριση υπολογιστικών επιλογών"><h3>Διαφορετικά εργαλεία. Διαφορετικές εργασίες.</h3><div className={s.compareScroll}><table><caption>Η μνήμη και τα ονομαστικά TOPS δεν αρκούν για κατάταξη πραγματικής επίδοσης.</caption><thead><tr><th scope="col">Πλατφόρμα</th><th scope="col">Αφετηρία χρήσης</th><th scope="col">Κρίσιμος έλεγχος</th></tr></thead><tbody>{equipment.filter(e => ['jetson-nano', 'dgx', 'thor'].includes(e.id)).map(e => <tr key={e.id}><th scope="row"><a href={e.sources[0].url} target="_blank" rel="noopener noreferrer">{e.name} ↗</a></th><td>{e.role}</td><td>{e.caveat}</td></tr>)}</tbody></table></div></section>}
      <div className={s.checks}><div><span className={s.eyebrow}>ΠΡΙΝ ΑΓΟΡΑΣΕΙΣ</span><h3>Τα επόμενα βήματα.</h3><ul>{mission.checks.map(check => <li key={check}><span aria-hidden="true">□</span>{check}</li>)}</ul></div><div className={s.notFor}><span className={s.eyebrow}>ΠΟΤΕ ΝΑ ΜΗΝ ΠΡΟΧΩΡΗΣΕΙΣ</span><h3>Τα όρια του πλάνου.</h3>{mission.notFor.map(limit => <p key={limit}>{limit}</p>)}<p>Δεν έχει πραγματοποιηθεί φυσική δοκιμή αυτής της διαμόρφωσης. Η παραγωγική χρήση απαιτεί τεχνική αξιολόγηση.</p></div></div>
    </section>}

    <section id="lab-evidence" className={s.evidence}><div><p className={s.eyebrow}>ΛΙΓΟΤΕΡΕΣ ΥΠΟΣΧΕΣΕΙΣ. ΠΕΡΙΣΣΟΤΕΡΑ ΤΕΚΜΗΡΙΑ.</p><h2>Να ξέρεις<br/><em>τι επιλέγεις.</em></h2></div><div className={s.evidenceRows}><article><span>Πηγές</span><div><h3>Η προδιαγραφή έχει διεύθυνση.</h3><p>Σύνδεσμοι κατασκευαστών και τεκμηρίωσης δίπλα στα εξαρτήματα. Έλεγχος περιεχομένου: {new Intl.DateTimeFormat('el-GR', { timeZone: 'Europe/Athens' }).format(new Date(CHECKED_AT + 'T12:00:00Z'))}.</p></div></article><article><span>Κόστος</span><div><h3>Εσύ ελέγχεις τις παραδοχές.</h3><p>Επεξεργάσιμα κονδύλια, ξεχωριστό αποθεματικό και σαφής διάκριση ανάμεσα σε σενάριο και πραγματική προσφορά.</p></div></article><article><span>Ειλικρίνεια</span><div><h3>Τα άγνωστα παραμένουν ορατά.</h3><p>Δεν υποθέτουμε συμβατότητα, ελληνική σπανιότητα, απόθεμα, ασφάλεια ή επίδοση. Η έκδοση MVP δεν περιλαμβάνει checkout ή ενεργά affiliate links.</p></div></article></div></section>
    <footer className={s.footer}><Link href="/" className={s.brand}>FOUND<span>.</span><small>LAB</small></Link><span>Από την ιδέα στο πρώτο τεκμηριωμένο πλάνο.</span><a href="#lab-builder">Σχεδίασε το δικό σου <Arrow/></a></footer>
    {notice && <div className={s.toast} role="status"><span>{notice}</span><button type="button" aria-label="Κλείσιμο ενημέρωσης" onClick={() => setNotice('')}>×</button></div>}
  </main>;
}
