---
name: socket-sfw
description: Set up and verify Socket Firewall Free (sfw) for Pi's non-interactive Bash commands and package installer using fail-closed PATH wrappers. Also supports legacy interactive aliases.
compatibility: Automatic setup on macOS/Linux (including WSL) with Node.js, Bash, and sfw. Native Windows has manual partial-coverage guidance only. Pi must support npmCommand and shellCommandPrefix settings.
---

# Socket SFW for Pi

Use this skill to protect supported package-manager commands without requiring the model or user to remember `sfw` on every command.

## Platform selection — required for every invocation

First read [the cross-platform runbook](references/platform-setup.md), whether invoked as a skill, through another agent, or by CLI. Identify the actual execution OS with `node -p process.platform` and the shell/config directory in that environment. Do not assume the parent agent's OS applies to a remote runner or subagent.

- **Linux/macOS/WSL Linux:** use the automatic setup below, then verify in the actual Pi session.
- **Native Windows:** do not run the POSIX setup. Prefer WSL for full current automation; otherwise follow the runbook's manual installer-only setup and explicitly report that native shell-tool wrapping is not implemented/tested.
- **Git Bash with Windows Node:** not WSL; do not bypass the Windows guard.

## Preferred setup: Pi Bash and installer

1. Inspect current Pi settings and check `sfw --help`. Preserve existing package-age policies. If `sfw` is absent, review Socket's official installation instructions with the user before bootstrapping it. Do not silently bypass existing protections to install it.
2. Explain that this changes global Pi `npmCommand` and `shellCommandPrefix`, not arbitrary command execution. If a custom `npmCommand` exists, explain that it will be replaced and backed up.
3. From this skill directory run:

```bash
node scripts/setup-pi-sfw.mjs
node scripts/setup-pi-sfw.mjs --verify-only
```

4. Ask the user to restart Pi. Check project overrides, PATH changes in any existing shell prefix, and subagent/SDK configuration separately if applicable.

The dependency-free script creates wrappers in `~/.local/share/socket-sfw/bin` for `npm`, `npx`, `yarn`, `pnpm`, `pip`, `pip3`, `uv`, and `cargo`. Each removes the wrapper directory from PATH and invokes SFW with the real executable and original arguments. Missing SFW fails closed rather than running unfiltered.

The script prepends the wrapper directory to Pi's Bash PATH and points the Pi installer directly at the npm wrapper. It backs up existing settings, preserves other fields, writes atomically, and respects `PI_CODING_AGENT_DIR`. The smoke tests run version commands, not downloads. Inspect the printed backup path before undoing changes.

## Verify only

```bash
node scripts/setup-pi-sfw.mjs --verify-only
```

This checks wrapper contents/executable permissions, Pi configuration, SFW availability, and installer/non-interactive Bash smoke tests without modifying files. A successful check is not proof that all extensions, child sessions, registries, or downloads are protected.

## Legacy interactive aliases (optional)

```bash
bash scripts/install-sfw-aliases.sh
bash scripts/install-sfw-aliases.sh --verify-only
```

That older installer installs SFW and writes interactive shell aliases. Prefer the Pi setup above for tool calls and package installation. Avoid adding aliases to wrappers unnecessarily (double wrapping). If SFW is already present, retain it rather than unnecessarily bootstrapping again.

## Boundaries and undo

- This is not an OS sandbox: absolute paths, changed PATH, config overrides, direct downloads, and arbitrary shell scripts can bypass it.
- SFW Free filters supported public registries, not private/custom registries, existing caches, or all lifecycle-hook activity. Child manager processes receive a cleaned PATH to avoid recursion.
- Extensions that spawn executables directly may not use Pi's shell prefix. Verify subagent settings; do not assume all SDK sessions load global shell settings.
- Keep `uv` as the default Python manager where required by project/user instructions. Do not replace package-age policy with SFW.
- Undo by restoring the settings backup or removing the managed prefix and restoring the prior `npmCommand`, then deleting the wrapper directory. Separately installed aliases remain.

SFW Free blocks confirmed malware, not every AI-flagged or unknown package, and collects non-configurable telemetry. See [Socket documentation summary](references/socket-firewall-free.md), [the platform runbook](references/platform-setup.md), and the repository README for further limitations.
