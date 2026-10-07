#!/usr/bin/env node
/**
 * RaceCalc DOM smoke tests: loads built pages in jsdom, bundles+executes
 * page scripts via esbuild, verifies each tool computes and renders results.
 */
import { JSDOM } from 'jsdom';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const CACHE = '.dom-test-cache';
if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
};

function bundleScript(srcPath, outName) {
  const out = join(CACHE, outName);
  execSync(
    `npx esbuild "${srcPath}" --bundle --format=iife --outfile="${out}" --log-level=error`,
    { stdio: 'pipe' },
  );
  return readFileSync(out, 'utf-8');
}

async function loadPage(path) {
  const html = readFileSync(path, 'utf-8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://racecalc.top/',
  });
  const { window } = dom;
  if (!window.crypto || !window.crypto.getRandomValues) {
    try {
      Object.defineProperty(window, 'crypto', {
        value: { getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 4294967296); return arr; } },
        configurable: true,
      });
    } catch { /* ignore */ }
  }
  const scripts = [...window.document.querySelectorAll('script[src]')];
  let i = 0;
  for (const s of scripts) {
    const src = s.getAttribute('src').replace(/^\//, 'dist/');
    try {
      window.eval(bundleScript(src, `b-${path.replace(/[^a-z0-9]/gi, '_')}-${i++}.js`));
    } catch (e) { console.log(`    (skip ${src}: ${e.message.slice(0, 80)})`); }
  }
  for (const s of window.document.querySelectorAll('script:not([src]):not([type="application/ld+json"])')) {
    try { window.eval(s.textContent); } catch (e) { console.log(`    (inline skip: ${e.message.slice(0, 80)})`); }
  }
  return dom;
}

console.log('RaceCalc DOM smoke tests\n');

// ---------------------------------------------------------------- FOV calculator
{
  const dom = await loadPage('dist/fov-calculator/index.html');
  const doc = dom.window.document;
  const val = (id) => doc.getElementById(id)?.textContent ?? '';
  console.log('fov-calculator:');
  // 27" 16:9 @60cm -> hFOV ≈ 53.0
  const h = parseFloat(val('out-h'));
  ok('default hFOV ≈ 53.0°', Math.abs(h - 52.96) < 0.3, `got "${val('out-h')}"`);
  const v = parseFloat(val('out-v'));
  ok('default vFOV ≈ 31.3°', Math.abs(v - 31.3) < 0.4, `got "${val('out-v')}"`);
  // switch to triple: note appears
  const setup = doc.getElementById('setup');
  setup.value = 'triple';
  setup.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  ok('triple mode shows rig note', !doc.getElementById('triple-note').hidden);
  // invalid input
  const size = doc.getElementById('size');
  size.value = '5';
  size.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  ok('invalid size marks field', size.closest('.field').classList.contains('invalid'));
}

// ---------------------------------------------------------------- triple screen
{
  const dom = await loadPage('dist/triple-screen-calculator/index.html');
  const doc = dom.window.document;
  const val = (id) => doc.getElementById(id)?.textContent ?? '';
  console.log('\ntriple-screen-calculator:');
  // per-screen ≈ 53.0, side angle 45 -> total ≈ 143.0
  const total = parseFloat(val('result-total'));
  ok('default total ≈ 143°', Math.abs(total - 142.96) < 0.4, `got "${val('result-total')}"`);
  const per = parseFloat(val('out-per'));
  ok('per-screen ≈ 53°', Math.abs(per - 52.96) < 0.3, `got "${val('out-per')}"`);
  // change angle
  const ang = doc.getElementById('side-angle');
  ang.value = '30';
  ang.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const total2 = parseFloat(val('result-total'));
  ok('30° angle -> total ≈ 113°', Math.abs(total2 - 112.96) < 0.4, `got "${val('result-total')}"`);
}

// ---------------------------------------------------------------- PPD
{
  const dom = await loadPage('dist/ppd-calculator/index.html');
  const doc = dom.window.document;
  const val = (id) => doc.getElementById(id)?.textContent ?? '';
  console.log('\nppd-calculator:');
  // default: 1920x1080 27" @60cm -> 1920 / 52.96 ≈ 36.3 PPD
  const ppd = parseFloat(val('result-ppd'));
  ok('default PPD ≈ 36.3 (1080p)', Math.abs(ppd - 36.3) < 0.5, `got "${val('result-ppd')}"`);
  // switch to 1440p
  const res = doc.getElementById('res');
  res.value = '2560x1440';
  res.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const ppd2 = parseFloat(val('result-ppd'));
  ok('1440p PPD ≈ 48.3', Math.abs(ppd2 - 48.3) < 0.5, `got "${val('result-ppd')}"`);
  const verdict = val('out-verdict');
  ok('verdict assigned', ['Retina-class', 'Crisp', 'Comfortable', 'Modest', 'Low (aliasing likely)'].includes(verdict), `got "${verdict}"`);
}

// ---------------------------------------------------------------- fuel
{
  const dom = await loadPage('dist/fuel-calculator/index.html');
  const doc = dom.window.document;
  const val = (id) => doc.getElementById(id)?.textContent ?? '';
  console.log('\nfuel-calculator:');
  // 3.2 lpL, 2% margin, 100 tank, 60 laps -> safe 30, 2 stints
  const safe = val('out-safe-laps');
  ok('safe laps = 30', safe === '30 laps', `got "${safe}"`);
  const stints = val('out-stints');
  ok('stints shows 2 (1 stop)', stints.startsWith('2 ('), `got "${stints}"`);
  // change laps to 15 -> 1 stint
  const laps = doc.getElementById('race-laps');
  laps.value = '25';
  laps.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  ok('25 laps -> 1 stint', val('out-stints').startsWith('1 ('), `got "${val('out-stints')}"`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
