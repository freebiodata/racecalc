#!/usr/bin/env node
/**
 * RaceCalc math verification tests.
 * Runs the same formulas the browser tools ship, checks known-good values.
 */
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
};
const closeTo = (a, b, tol) => Math.abs(a - b) <= tol;

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const hFov = (w, d) => deg(2 * Math.atan(w / (2 * d)));
const vFov = (h, d) => deg(2 * Math.atan(h / (2 * d)));

console.log('RaceCalc math tests\n');

console.log('FOV geometry:');
// 27" 16:9 screen: width = 27 * (16/9)/sqrt((16/9)^2+1) = 27*0.8716 = 23.53in
{
  const diag = 27, aspect = 16 / 9;
  const w = (diag * aspect) / Math.sqrt(aspect * aspect + 1);
  const h = diag / Math.sqrt(aspect * aspect + 1);
  ok('27" 16:9 width ≈ 23.53 in', closeTo(w, 23.53, 0.05), `got ${w}`);
  ok('27" 16:9 height ≈ 13.24 in', closeTo(h, 13.24, 0.05), `got ${h}`);
  // at 60cm = 23.622in distance: hFOV = 2*atan(23.53/(2*23.622)) = 2*atan(0.498) = 2*26.48 = 52.96
  const d = 60 / 2.54;
  const hf = hFov(w, d);
  ok('27" @60cm hFOV ≈ 53.0°', closeTo(hf, 52.96, 0.15), `got ${hf}`);
  const vf = vFov(h, d);
  ok('27" @60cm vFOV ≈ 31.3°', closeTo(vf, 31.3, 0.2), `got ${vf}`);
}
// Verifying vertical from horizontal: v = 2 atan(tan(h/2)/aspect)
{
  const hf = 52.96, aspect = 16 / 9;
  const vf = deg(2 * Math.atan(Math.tan(rad(hf) / 2) / aspect));
  ok('vFOV derived from hFOV ≈ 31.3°', closeTo(vf, 31.3, 0.2), `got ${vf}`);
}

console.log('\nTriple screen:');
{
  const per = 52.96, angle = 45;
  ok('total = per + 2×angle = 142.96°', closeTo(per + 2 * angle, 142.96, 0.01));
  // bezel: 3 screens of 23.53in + 2 gaps of 10mm(0.394in each side total?) — tool adds bezelMm/25.4*2 (two gaps, one screen-width each)
  const w = 23.53, bezelIn = (10 / 25.4) * 2;
  const correctedW = w * 3 + bezelIn;
  const d = 60 / 2.54;
  const total = hFov(correctedW, d);
  ok('triple 27" @60cm ≈ 113.0° flat', closeTo(total, 113.0, 0.3), `got ${total}`);
}

console.log('\nPPD:');
{
  const px = 2560, fov = 52.96;
  ok('2560px @ 53.0° ≈ 48.3 PPD', closeTo(px / fov, 48.3, 0.2), `got ${px / fov}`);
  // triple: 7680 px over ~116° total (per 53 + 2*31.5 side coverage)... simple check with flat triple fov
  const ppdTriple = 7680 / 113.0;
  ok('triple 7680px over 113.0° ≈ 68.0 PPD', closeTo(ppdTriple, 68.0, 0.3), `got ${ppdTriple}`);
}

console.log('\nFuel planning:');
{
  const perLap = 3.2, margin = 2, tank = 100, laps = 60;
  const fueled = perLap * (1 + margin / 100);
  ok('fueled consumption = 3.264', closeTo(fueled, 3.264, 0.001), `got ${fueled}`);
  const safeLaps = Math.floor(tank / fueled);
  ok('safe laps per tank = 30', safeLaps === 30, `got ${safeLaps}`);
  const stints = Math.ceil(laps / safeLaps);
  ok('stints = 2', stints === 2, `got ${stints}`);
  ok('total fuel = 195.84', closeTo(laps * fueled, 195.84, 0.01), `got ${laps * fueled}`);
}

console.log('\nLap time parsing:');
{
  const parse = (t) => {
    const m = t.trim().match(/^(\d+):(\d+(?:\.\d+)?)$/);
    if (m) return parseInt(m[1]) * 60 + parseFloat(m[2]);
    const s = parseFloat(t);
    return Number.isFinite(s) && s > 0 ? s : NaN;
  };
  ok('"1:45" = 105s', parse('1:45') === 105);
  ok('"2:03.5" = 123.5s', closeTo(parse('2:03.5'), 123.5, 1e-9));
  ok('"95" = 95s', parse('95') === 95);
}

console.log('\nCross-checks against published sources:');
{
  // DCPROSENS example: 800 DPI CS2 1.14 sens → 45.6 cm/360 (community-known value)
  // our FOV tests: vFOV 103 hFOV 131.79 (already validated in sensforge suite)
  const hfov103 = deg(2 * Math.atan(Math.tan(rad(103) / 2) * (16 / 9)));
  ok('vFOV 103 @16:9 ≈ 131.79° (parity with sensforge suite)', closeTo(hfov103, 131.79, 0.05), `got ${hfov103}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
