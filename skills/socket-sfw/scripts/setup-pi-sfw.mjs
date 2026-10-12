#!/usr/bin/env node
// No dependencies. Installs wrappers and configures Pi; does not install sfw.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

if (process.platform === 'win32') {
  console.error('Native Windows is not supported by these POSIX wrappers. No configuration was changed. Use WSL/Linux, or follow references/platform-setup.md for partial native Windows setup.');
  process.exit(1);
}

const verify = process.argv.includes('--verify-only');
if (process.argv.slice(2).some(arg => arg !== '--verify-only')) {
  console.error('Usage: node setup-pi-sfw.mjs [--verify-only]');
  process.exit(1);
}
const home = os.homedir();
const bin = path.join(home, '.local', 'share', 'socket-sfw', 'bin');
const settingsPath = path.join(process.env.PI_CODING_AGENT_DIR || path.join(home, '.pi', 'agent'), 'settings.json');
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const prefix = `export PATH=${quote(bin)}:"$PATH"; # socket-sfw Pi PATH\n`;
const managers = ['npm', 'npx', 'yarn', 'pnpm', 'pip', 'pip3', 'uv', 'cargo'];
const wrapper = `#!/bin/sh
# Managed by pi-socket-sfw. Never silently fall back to an unfiltered command.
shim_dir=\${0%/*}
name=\${0##*/}
# Remove our directory before resolving both sfw and the real manager.
# Also omit empty/current-directory PATH entries to avoid local executable hijacks.
rest=$PATH
clean=
while :; do
  part=\${rest%%:*}
  case "$part" in ''|.|"$shim_dir") ;; *) clean=\${clean:+$clean:}$part ;; esac
  case "$rest" in *:*) rest=\${rest#*:} ;; *) break ;; esac
done
PATH=$clean
export PATH
real=$(command -v "$name") || { echo "socket-sfw: $name not installed" >&2; exit 127; }
firewall=$(command -v sfw) || { echo "socket-sfw: sfw missing; refusing unfiltered $name" >&2; exit 127; }
exec "$firewall" "$real" "$@"
`;

function check(result, label) {
  if (result.error || result.status !== 0) throw new Error(`${label} failed: ${result.error || result.stderr || result.stdout}`);
}
try {
  check(spawnSync('sfw', ['--help'], { encoding: 'utf8' }), 'sfw --help');
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Pi settings must be a JSON object');
  if (settings.shellCommandPrefix != null && typeof settings.shellCommandPrefix !== 'string') throw new Error('shellCommandPrefix must be a string');
  const npmCommand = [path.join(bin, 'npm')];
  if (verify) {
    for (const manager of managers) {
      const file = path.join(bin, manager);
      fs.accessSync(file, fs.constants.X_OK);
      if (fs.readFileSync(file, 'utf8') !== wrapper) throw new Error(`Unexpected wrapper: ${file}`);
    }
    if (JSON.stringify(settings.npmCommand) !== JSON.stringify(npmCommand)) throw new Error('Pi npmCommand is not protected');
    if (!settings.shellCommandPrefix?.startsWith(prefix)) throw new Error('Pi shellCommandPrefix is not protected');
  } else {
    fs.mkdirSync(bin, { recursive: true, mode: 0o700 });
    // Refuse symlinked wrapper files rather than overwrite their targets.
    for (const manager of managers) {
      const file = path.join(bin, manager);
      if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error(`Refusing symlink: ${file}`);
      fs.writeFileSync(file, wrapper, { mode: 0o700 });
      fs.chmodSync(file, 0o700);
    }
    const oldPrefix = settings.shellCommandPrefix || '';
    settings.shellCommandPrefix = oldPrefix.startsWith(prefix) ? oldPrefix : prefix + oldPrefix;
    settings.npmCommand = npmCommand;
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    if (fs.existsSync(settingsPath)) {
      const backup = `${settingsPath}.socket-sfw-backup-${Date.now()}`;
      fs.copyFileSync(settingsPath, backup, fs.constants.COPYFILE_EXCL);
      console.log(`Backup: ${backup}`);
    }
    const temp = `${settingsPath}.socket-sfw-${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(settings, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, settingsPath);
  }
  check(spawnSync(npmCommand[0], ['--version'], { encoding: 'utf8' }), 'Pi installer wrapper');
  const bashCheck = `[ "$(command -v npm)" = ${quote(npmCommand[0])} ] || { echo 'npm wrapper is shadowed by shell configuration' >&2; exit 1; }; npm --version`;
  check(spawnSync('/bin/bash', ['-c', settings.shellCommandPrefix + bashCheck], { encoding: 'utf8' }), 'non-interactive Bash wrapper');
  console.log(`Socket SFW Pi protection ${verify ? 'verified' : 'configured'}: ${settingsPath}`);
  console.log('Restart Pi to apply the Bash prefix reliably. /reload reloads settings but is not a substitute for restarting existing processes.');
} catch (error) {
  console.error(`socket-sfw: ${error.message}`);
  process.exit(1);
}
