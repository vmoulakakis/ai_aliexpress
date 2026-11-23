import { equipment, missions, getMission, type MissionId, type Tier, type Equipment } from './catalog';

export const normalize = (text: string) => text.toLocaleLowerCase('el-GR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function matchMission(text: string): MissionId | null {
  const value = normalize(text.trim());
  const ranked = missions.map(m => ({ id: m.id, score: m.keywords.reduce((sum, k) => sum + (value.includes(k) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
  return ranked[0].score > 0 && ranked[0].score !== ranked[1].score ? ranked[0].id : null;
}
export type PlanInput = { mission: MissionId; tier: Tier; budget: number; existingTraining: boolean; contingency: number; allowances?: Record<string, number> };
export type Line = Equipment & { amount: number };
export function createPlan(input: PlanInput) {
  if (!Number.isFinite(input.budget) || input.budget < 100 || input.budget > 100000) throw new Error('Ο προϋπολογισμός πρέπει να είναι από 100 έως 100.000 €.');
  if (!Number.isFinite(input.contingency) || input.contingency < 0 || input.contingency > 50) throw new Error('Το αποθεματικό πρέπει να είναι από 0% έως 50%.');
  if (!missions.some(m => m.id === input.mission) || !['starter', 'advanced'].includes(input.tier)) throw new Error('Επίλεξε έγκυρο σενάριο και διαμόρφωση.');
  const mission = getMission(input.mission);
  const ids = mission.configurations[input.tier].filter(id => !(id === 'training' && input.existingTraining));
  const lines: Line[] = ids.map(id => {
    const item = equipment.find(e => e.id === id)!;
    const amount = input.allowances?.[id] ?? item.allowance;
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000) throw new Error('Κάθε πρόβλεψη κόστους πρέπει να είναι από 0 έως 100.000 €.');
    return { ...item, amount };
  });
  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
  const reserve = Math.round(subtotal * input.contingency) / 100;
  const total = Math.round((subtotal + reserve) * 100) / 100;
  return { mission, lines, subtotal, reserve, total, remaining: Math.round((input.budget - total) * 100) / 100, withinBudget: total <= input.budget };
}

export function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export function exportPlan(input: PlanInput, goal: string): string {
  const plan = createPlan(input);
  const rows: unknown[][] = [
    ['FOUND. LAB', 'Σενάριο προϋπολογισμού — όχι εμπορική προσφορά'],
    ['Στόχος', goal], ['Σενάριο', plan.mission.label], ['Προϋπολογισμός EUR', input.budget],
    ['Εξοπλισμός', 'Ρόλος', 'Πρόβλεψη EUR', 'Πηγή', 'Περιορισμός'],
    ...plan.lines.map(l => [l.name, l.role, l.amount, l.sources[0]?.url ?? 'Δεν έχει επιλεγεί SKU', l.caveat]),
    ['Υποσύνολο EUR', plan.subtotal], ['Αποθεματικό EUR', plan.reserve], ['Σύνολο σεναρίου EUR', plan.total],
    ['ΦΠΑ / αποστολή / εγκατάσταση', 'Δεν έχουν επιβεβαιωθεί. Προσαρμόστε τα κονδύλια μετά από προσφορά.'],
    ['Περιεχόμενο πηγών ελέγχθηκε', '2026-11-23'],
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export type SavedPlan = { version: 1; input: PlanInput; goal: string; savedAt: string };
export function readSaved(value: unknown): SavedPlan | null {
  try {
    if (!value || typeof value !== 'object') return null;
    const saved = value as SavedPlan;
    if (saved.version !== 1 || typeof saved.goal !== 'string' || saved.goal.length > 750 || typeof saved.savedAt !== 'string' || !Number.isFinite(Date.parse(saved.savedAt))) return null;
    if (typeof saved.input?.existingTraining !== 'boolean') return null;
    if (saved.input.allowances && (typeof saved.input.allowances !== 'object' || Array.isArray(saved.input.allowances))) return null;
    createPlan(saved.input);
    return saved;
  } catch { return null; }
}
