import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const scriptUrl = new URL('../skills/socket-sfw/scripts/setup-pi-sfw.mjs', import.meta.url);
const script = scriptUrl.pathname;

test('Windows guard refuses setup before writing configuration (simulated platform)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-sfw-windows-guard-'));
  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      `Object.defineProperty(process, 'platform', { value: 'win32' }); await import(${JSON.stringify(scriptUrl.href)});`], {
      env: { ...process.env, HOME: root, PI_CODING_AGENT_DIR: path.join(root, 'agent') },
      encoding: 'utf8'
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Native Windows is not supported/);
    assert.deepEqual(fs.readdirSync(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Pi wrappers: config preservation, idempotency, args, recursion and fail-closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-sfw-test-'));
  try {
    const home = path.join(root, "home with ' quote");
    const realBin = path.join(root, 'real-bin');
    const agent = path.join(home, '.pi', 'agent');
    fs.mkdirSync(agent, { recursive: true });
    fs.mkdirSync(realBin);
    const log = path.join(root, 'calls');
    const executable = (name, body) => fs.writeFileSync(path.join(realBin, name), '#!/bin/sh\n' + body, { mode: 0o700 });
    executable('sfw', 'if [ "$1" = --help ]; then echo "Socket Firewall Free"; exit; fi\nprintf "sfw\\n" >> "$TEST_LOG"\nexec "$@"\n');
    executable('npm', 'echo 1.0.0\n');
    executable('uv', 'printf "%s\\n" "$@"\n');
    const settingsPath = path.join(agent, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ defaultTools: ['+codemode'], packages: ['example'], shellCommandPrefix: 'export EXISTING=yes;\n' }));
    const env = { ...process.env, HOME: home, PI_CODING_AGENT_DIR: agent, PATH: realBin + ':/usr/bin:/bin', TEST_LOG: log };
    const run = (...args) => spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8' });
    assert.equal(run().status, 0);
    const first = fs.readFileSync(settingsPath, 'utf8');
    assert.equal(run().status, 0);
    assert.equal(fs.readFileSync(settingsPath, 'utf8'), first);
    assert.equal(run('--verify-only').status, 0);
    const settings = JSON.parse(first);
    assert.deepEqual(settings.defaultTools, ['+codemode']);
    assert.deepEqual(settings.packages, ['example']);
    assert.ok(settings.shellCommandPrefix.includes('export EXISTING=yes;'));
    const result = spawnSync('/bin/bash', ['-c', settings.shellCommandPrefix + 'uv "argument with spaces" \'quote"arg\'; printf "%s" "$EXISTING"'], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'argument with spaces\nquote"arg\nyes');
    assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 7);
    // npmCommand also works when PATH already contains our wrappers.
    const shim = path.dirname(settings.npmCommand[0]);
    const wrappedEnv = { ...env, PATH: shim + ':' + env.PATH };
    assert.equal(spawnSync(settings.npmCommand[0], ['--version'], { env: wrappedEnv }).status, 0);
    executable('sfw', 'exit 42\n');
    assert.equal(spawnSync(settings.npmCommand[0], ['--version'], { env: wrappedEnv }).status, 42);
    fs.unlinkSync(path.join(realBin, 'sfw'));
    assert.equal(spawnSync(settings.npmCommand[0], ['--version'], { env: wrappedEnv }).status, 127);
    // Invalid settings fail before edits.
    fs.writeFileSync(settingsPath, '{bad json');
    executable('sfw', 'exit 0\n');
    assert.equal(run().status, 1);
    assert.equal(fs.readFileSync(settingsPath, 'utf8'), '{bad json');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
