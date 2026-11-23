const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPlan, matchMission, exportPlan, readSaved } = require('/tmp/found-lab-test/planner.js');
const base = { mission: 'robotics', tier: 'starter', budget: 5000, existingTraining: false, contingency: 15 };
test('Greek/English matching and ambiguous goals', () => {
  assert.equal(matchMission('Θέλω τοπικό AI για τα έγγραφά μου'), 'local');
  assert.equal(matchMission('ρομποτικός βραχίονας'), 'robotics');
  assert.equal(matchMission('οπτικός έλεγχος ελαττωμάτων'), 'vision');
  assert.equal(matchMission('local robot'), null);
  assert.equal(matchMission('θέλω καλύτερο αποτέλεσμα'), null);
});
test('every combination is complete and arithmetic is correct', () => {
  for (const mission of ['local', 'robotics', 'vision']) for (const tier of ['starter', 'advanced']) {
    const plan = createPlan({ ...base, mission, tier });
    assert.ok(plan.lines.length > 0); assert.ok(plan.lines.every(line => line.name));
    assert.equal(plan.total, Math.round((plan.subtotal + plan.reserve) * 100) / 100);
  }
});
test('existing compute is excluded only from training line', () => {
  const full = createPlan(base); const reused = createPlan({ ...base, existingTraining: true });
  assert.ok(!reused.lines.some(l => l.id === 'training'));
  assert.equal(full.subtotal - reused.subtotal, 2500);
});
test('editable allowances and reserve, zero cost and insufficient budget', () => {
  const plan = createPlan({ ...base, budget: 100, allowances: { so101: 20, camera: 30, training: 0 }, contingency: 10 });
  assert.equal(plan.total, 55); assert.equal(plan.remaining, 45);
  assert.equal(createPlan({ ...base, budget: 100 }).withinBudget, false);
});
test('rejects invalid or malicious numeric input and identities', () => {
  for (const budget of [NaN, Infinity, 0, -1, 100001]) assert.throws(() => createPlan({ ...base, budget }));
  assert.throws(() => createPlan({ ...base, contingency: NaN }));
  assert.throws(() => createPlan({ ...base, allowances: { so101: -1 } }));
  assert.throws(() => createPlan({ ...base, mission: 'unknown' }));
});
test('CSV carries current prices, sources, limitations and formula protection', () => {
  const csv = exportPlan(base, '=IMPORTXML("bad")');
  assert.ok(csv.includes("'=IMPORTXML")); assert.ok(csv.includes('https://huggingface.co/docs/lerobot/so101'));
  assert.ok(csv.includes('όχι εμπορική προσφορά')); assert.ok(csv.includes('ΦΠΑ'));
});
test('local plan validation rejects corrupt or oversized state', () => {
  const saved = { version: 1, input: base, goal: 'robotics', savedAt: new Date().toISOString() };
  assert.ok(readSaved(saved)); assert.equal(readSaved({ ...saved, version: 99 }), null);
  assert.equal(readSaved({ ...saved, goal: 'x'.repeat(751) }), null);
  assert.equal(readSaved({ ...saved, input: { ...base, budget: '1000' } }), null);
  assert.equal(readSaved(null), null);
});
