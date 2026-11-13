// LOCAL DEV ONLY — a stand-in for the carbon footprint backend.
//
// The live backend (api.karmaverse.earth) doesn't serve /api/v1/carbon-footprint
// yet, so `npm run web:local` answers those routes here instead, following the
// backend team's "Carbon Footprint — API Integration Guide (Frontend)": fixed
// topic order, strict answer shapes, history, summary and goals.
//
// The kg numbers are PLACEHOLDERS for testing the screens, not real emission
// factors. Data lives in memory per logged-in user and is lost on restart.

'use strict';

const crypto = require('crypto');

const ORDER = ['transport', 'electricity', 'diet', 'waste', 'water', 'flights'];
const QUESTIONS = {
  transport: 'How do you usually commute, and roughly how far each day (in km)?',
  electricity: 'Roughly how many electricity units (kWh) does your household use per month, and is it mostly grid, solar, or mixed?',
  diet: 'Which best describes your diet?',
  waste: 'Do you segregate your waste, and roughly how many kg do you throw away each week?',
  water: 'Roughly how many litres of water do you use per day?',
  flights: 'How many short-haul and long-haul flights do you take per year?',
};
const num = (min, max) => (v) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const oneOf = (...xs) => (v) => xs.includes(v);
const SHAPES = {
  transport: { mode: oneOf('car_petrol', 'car_diesel', 'car_ev', 'bike', 'bus', 'train', 'walk_cycle', 'none'), kmPerDay: num(0, 1000) },
  electricity: { unitsKwhPerMonth: num(0, 10000), source: oneOf('grid', 'solar', 'mixed') },
  diet: { dietType: oneOf('vegan', 'vegetarian', 'eggetarian', 'non_veg_moderate', 'non_veg_heavy') },
  waste: { segregatesWaste: (v) => typeof v === 'boolean', kgPerWeek: num(0, 500) },
  water: { litersPerDay: num(0, 5000) },
  flights: { shortHaulPerYear: num(0, 100), longHaulPerYear: num(0, 100) },
};
// Placeholder multipliers (NOT the backend's real factors).
const PER_KM = { car_petrol: 0.17, car_diesel: 0.17, car_ev: 0.08, bike: 0.06, bus: 0.03, train: 0.02, walk_cycle: 0, none: 0 };
const DIET_PER_DAY = { vegan: 2.9, vegetarian: 3.8, eggetarian: 4.2, non_veg_moderate: 5.6, non_veg_heavy: 7.2 };
const SOURCE_SHARE = { grid: 1, mixed: 0.5, solar: 0.1 };
const r2 = (n) => Math.round(n * 100) / 100;

function assessedAt(d) {
  const ist = new Date(d.getTime() + 330 * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  const h = ist.getUTCHours();
  return {
    date: `${pad(ist.getUTCDate())}/${pad(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}`,
    day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][ist.getUTCDay()],
    time: `${pad(h % 12 || 12)}:${pad(ist.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`,
  };
}

function calculate(a, sessionId, n) {
  const breakdown = {
    transport: a.transport.kmPerDay * 30 * PER_KM[a.transport.mode],
    electricity: a.electricity.unitsKwhPerMonth * 0.71 * SOURCE_SHARE[a.electricity.source],
    diet: DIET_PER_DAY[a.diet.dietType] * 30,
    waste: a.waste.kgPerWeek * (52 / 12) * (a.waste.segregatesWaste ? 0.4 : 0.6),
    water: (a.water.litersPerDay * 30 / 1000) * 0.25,
    flights: (a.flights.shortHaulPerYear * 190 + a.flights.longHaulPerYear * 900) / 12,
  };
  for (const k of Object.keys(breakdown)) breakdown[k] = r2(breakdown[k]);
  const total = r2(Object.values(breakdown).reduce((s, v) => s + v, 0));
  const top = Object.entries(breakdown).sort((x, y) => y[1] - x[1])[0][0];
  const now = new Date();
  return {
    _id: `mock-result-${n}-${crypto.randomUUID().slice(0, 8)}`,
    sessionId,
    emissionFactorVersion: 'dev-mock',
    breakdown,
    totalKgCO2ePerMonth: total,
    totalKgCO2ePerYear: r2(total * 12),
    score: r2(Math.max(0, 100 - total / 20)),
    category: total < 250 ? 'low' : total < 450 ? 'medium' : 'high',
    tips: [`Your biggest source is ${top}. (Local test data: these numbers are placeholders.)`],
    periodLabel: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    assessedAt: assessedAt(now),
  };
}

function createCarbonMock() {
  const users = new Map(); // auth hash -> { session, results, goal }
  const user = (req) => {
    const key = crypto.createHash('sha256').update(req.headers.authorization || '').digest('hex');
    if (!users.has(key)) users.set(key, { session: null, results: [], goal: null });
    return users.get(key);
  };
  const goalView = (u) => {
    const current = u.results[0].totalKgCO2ePerMonth;
    const span = u.goal.baselineKgCO2ePerMonth - u.goal.targetKgCO2ePerMonth;
    const progressPercent = span > 0 ? Math.min(100, Math.max(0, r2(((u.goal.baselineKgCO2ePerMonth - current) / span) * 100))) : 0;
    const achieved = current <= u.goal.targetKgCO2ePerMonth;
    return { goal: { ...u.goal, status: achieved ? 'achieved' : 'active' }, progress: { currentKgCO2ePerMonth: current, progressPercent, achieved } };
  };

  /** Handles /api/v1/carbon-footprint/*; returns false for any other path. */
  return function handle(req, res, origin) {
    const url = new URL(req.url, 'http://local');
    if (!url.pathname.startsWith('/api/v1/carbon-footprint')) return false;
    const p = url.pathname.slice('/api/v1/carbon-footprint'.length);
    const send = (status, data, message = 'OK') => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' });
      res.end(JSON.stringify(status < 400 ? { success: true, statusCode: status, message, data } : { success: false, statusCode: status, message }));
    };
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (!/^Bearer \S+/.test(req.headers.authorization || '')) return send(401, null, 'Please log in');
      let body = {};
      try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; } catch { return send(400, null, 'Invalid JSON'); }
      const u = user(req);
      const next = () => ({ category: ORDER[u.session.answers.length], questionText: QUESTIONS[ORDER[u.session.answers.length]] });

      if (req.method === 'POST' && p === '/session/start') {
        if (!u.session) u.session = { sessionId: crypto.randomUUID(), answers: [] };
        return send(200, { sessionId: u.session.sessionId, status: 'in_progress', nextQuestion: next() });
      }
      if (req.method === 'GET' && p === '/session') {
        if (!u.session) return send(404, null, 'No active session');
        return send(200, { sessionId: u.session.sessionId, status: 'in_progress', answeredCategories: ORDER.slice(0, u.session.answers.length), nextQuestion: next() });
      }
      if (req.method === 'DELETE' && p === '/session') {
        if (!u.session) return send(404, null, 'No active session');
        u.session = null;
        return send(200, { message: 'Session abandoned.' });
      }
      if (req.method === 'POST' && p === '/session/answer') {
        if (!u.session) return send(404, null, 'No active session — call /session/start first');
        const { category, answer } = body;
        const expected = ORDER[u.session.answers.length];
        if (category !== expected) return send(400, null, `Expected category "${expected}"`);
        const shape = SHAPES[category];
        const keys = Object.keys(answer || {});
        if (keys.length !== Object.keys(shape).length || !keys.every((k) => shape[k] && shape[k](answer[k]))) return send(400, null, `Invalid answer for ${category}`);
        u.session.answers.push(answer);
        if (u.session.answers.length < ORDER.length) return send(200, { extracted: answer, nextQuestion: next(), completed: false });
        const a = Object.fromEntries(ORDER.map((c, i) => [c, u.session.answers[i]]));
        const result = calculate(a, u.session.sessionId, u.results.length + 1);
        u.results.unshift(result);
        u.session = null;
        return send(200, { extracted: answer, completed: true, result });
      }
      if (req.method === 'GET' && p === '/result/latest') {
        if (!u.results.length) return send(404, null, 'No completed assessment');
        const [r, prev] = u.results;
        return send(200, { result: r, comparison: prev ? { deltaKgCO2ePerMonth: r2(r.totalKgCO2ePerMonth - prev.totalKgCO2ePerMonth), improved: r.totalKgCO2ePerMonth < prev.totalKgCO2ePerMonth, previousPeriodLabel: prev.periodLabel } : null });
      }
      if (req.method === 'GET' && p === '/result/history') {
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '12', 10);
        if (!(page >= 1) || !(limit >= 1 && limit <= 50)) return send(400, null, 'Invalid page or limit');
        const start = (page - 1) * limit;
        const results = u.results.slice(start, start + limit);
        const totalPages = Math.max(1, Math.ceil(u.results.length / limit));
        return send(200, { results, pagination: { page, limit, totalCount: u.results.length, totalPages, hasMore: page < totalPages } });
      }
      if (req.method === 'GET' && p === '/result/summary') {
        if (!u.results.length) return send(404, null, 'No completed assessment');
        const t = u.results.map((r) => r.totalKgCO2ePerMonth);
        return send(200, { totalAssessments: t.length, averageKgCO2ePerMonth: r2(t.reduce((s, v) => s + v, 0) / t.length), bestKgCO2ePerMonth: Math.min(...t) });
      }
      if (req.method === 'POST' && p === '/goal') {
        const pct = body.reductionPercent;
        if (typeof pct !== 'number' || pct < 1 || pct > 90) return send(400, null, 'reductionPercent must be a number from 1 to 90');
        if (!u.results.length) return send(404, null, 'No completed assessment');
        const baseline = u.results[0].totalKgCO2ePerMonth;
        u.goal = { reductionPercent: pct, baselineKgCO2ePerMonth: baseline, targetKgCO2ePerMonth: r2(baseline * (1 - pct / 100)), status: 'active', createdAt: new Date().toISOString() };
        return send(200, goalView(u));
      }
      if (req.method === 'GET' && p === '/goal') {
        if (!u.goal || !u.results.length) return send(404, null, 'No goal set');
        return send(200, goalView(u));
      }
      return send(404, null, 'Not found');
    });
    return true;
  };
}

module.exports = { createCarbonMock };
