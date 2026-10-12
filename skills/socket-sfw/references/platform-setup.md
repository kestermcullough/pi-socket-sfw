# Platform setup and agent runbook

Read this regardless of whether you reached the skill through `/skill:socket-sfw`, natural-language delegation, a subagent, a CLI agent, or a standalone script. Installation of the skill itself does not apply protection.

## First: identify the actual execution environment

```text
node -p "process.platform + ' ' + process.arch"
```

Determine the current user's HOME, active Pi configuration directory (`PI_CODING_AGENT_DIR` or `~/.pi/agent`), package-manager executable locations, and the shell Pi actually uses. Ask permission before global config changes. Read and preserve existing settings, custom `npmCommand`, shell prefixes, lockfiles, and package-age policies. Do not put tokens/credentials into logs or repository files.

Do not infer the OS from the parent agent's host: SSH, containers, WSL, subagents, and remote runners may execute elsewhere. Configure and verify each environment separately. SDK clients may ignore Pi's global shell settings or replace its Bash tool; they need equivalent explicit configuration.

## Linux (and macOS): automatic Pi protection

Prerequisites: Node.js, `/bin/sh`, `/bin/bash`, and SFW on PATH. The script uses POSIX wrappers; no zsh or interactive aliases are required.

If SFW is missing, consult the [official installation instructions](https://docs.socket.dev/docs/socket-firewall-free). With user approval, bootstrap using npm:

```bash
npm install -g sfw
sfw --help
```

This bootstrap is not protected by SFW itself. Respect local installation policy; do not use sudo, disable verification, or bypass a configured firewall without approval. Socket also publishes native Linux x86_64/ARM64 binaries. Check the architecture and release source; do not blindly execute downloaded files. Use a user-owned executable directory if possible. SFW needs network access for package checks.

From the repository root:

```bash
node skills/socket-sfw/scripts/setup-pi-sfw.mjs
node skills/socket-sfw/scripts/setup-pi-sfw.mjs --verify-only
node --test tests/*.test.mjs
```

From an installed skill's directory, the equivalent commands are:

```bash
node scripts/setup-pi-sfw.mjs
node scripts/setup-pi-sfw.mjs --verify-only
```

Restart Pi, then ask it to run `command -v npm; npm --version` in its Bash tool. The resolved npm must be `~/.local/share/socket-sfw/bin/npm`. Check the actual Pi settings contain the managed prefix and protected `npmCommand`. Run the script's verification again in the target environment. Read-only version checks demonstrate routing, not malware blocking or a real registry download. If stronger confirmation is needed, inspect SFW verbose output during a user-approved benign package operation; do not install a malicious package to test it.

If `/bin/bash` is unavailable (for example, a minimal container), stop and explain the unmet prerequisite. Do not claim protection, silently install a different shell, or run the setup in a different environment instead.

### CI, remote shells, and other agents

Pi's prefix is not a system-wide PATH change. For standalone shell steps, prepend the wrapper directory in **each process/job** that needs it:

```bash
export PATH="$HOME/.local/share/socket-sfw/bin:$PATH"
command -v npm
npm --version
```

A later Node/Python activation may put another directory ahead of the wrappers. Recheck resolution after activating the environment. Commands that spawn directly rather than through Pi's Bash tool must receive the wrapper PATH themselves, or use SFW explicitly. Never assume a subagent inherited this protection merely because its parent did.

## Windows: prefer WSL for the full current automation

The repository's automatic PATH-wrapper setup is POSIX-only. The setup script rejects native Windows before editing configuration. It does **not** currently implement tested PowerShell/CMD wrappers.

For full current automation, use WSL with a Linux distribution and run Node, Pi, SFW, and the setup **inside WSL**. Follow the Linux steps above. Check `node -p process.platform` prints `linux` and that `command -v node`, `command -v pi`, and `command -v sfw` are Linux executables, not Windows `.exe` files under `/mnt/c`. The WSL HOME/settings are distinct from native Windows. This protects Pi running in WSL, not native Windows Pi or PowerShell sessions.

Git Bash/MSYS is not equivalent to WSL: Windows Node reports `win32`, PATH conversion and `.cmd` launching differ, and the installer intentionally refuses it. Do not disable the guard to force it through.

## Native Windows: manual, partial setup (not validated here)

Socket publishes Windows x86_64 and ARM64 SFW executables. Native Windows SFW support does not mean this repository's POSIX wrappers work on Windows.

1. Check the host architecture and obtain/install SFW from Socket's official instructions. With user approval, `npm install -g sfw` is one bootstrap option. Use a user-owned PATH directory; in PowerShell use `$env:USERPROFILE` / `$env:LOCALAPPDATA`, not literal `%USERPROFILE%` strings.
2. Open a fresh PowerShell and inspect resolution:

```powershell
Get-Command sfw, npm, node | Select-Object Name, CommandType, Source
sfw --help
sfw npm --version
```

3. **Only if those checks succeed**, back up the native Pi `settings.json` (normally `$env:USERPROFILE\.pi\agent\settings.json`, or under `$env:PI_CODING_AGENT_DIR`). Merge this setting into the existing JSON, preserving unrelated fields:

```json
{
  "npmCommand": ["C:/actual/path/to/sfw.exe", "npm"]
}
```

The path above is a placeholder, not a command to copy verbatim. Use the actual SFW executable or launcher resolved on that machine. Prefer the native `.exe` when available; `.cmd` launchers need local validation. Do not replace the whole settings file with this example. Pi's installer accepts wrapper commands, but SFW/Pi version compatibility and Windows command dispatch must be checked on the target machine. Restart Pi and verify a benign package lookup/install with approval. A failed invocation is an error to fix, not permission to fall back to unfiltered npm.

4. Native Windows **shell-tool automatic wrapping remains unimplemented**. Until a verified native wrapper implementation is available, explicitly use `sfw npm ...` / `sfw uv ...` for supported operations, or move the Pi session to WSL. State clearly that this is only partial coverage. Do not advertise the installer setting as protection for arbitrary Bash/PowerShell/CMD commands.

PowerShell aliases cannot inject arguments into commands; profile functions affect only sessions loading that profile, and neither covers arbitrary subprocesses. POSIX `export PATH=...` in `shellCommandPrefix` is invalid for PowerShell/CMD. Do not add it on native Windows. If a future agent implements native wrappers, it must:

- identify whether Pi uses Bash, CMD, or its PowerShell tool and configure the appropriate pipeline (not assume the Bash prefix covers PowerShell);
- implement argument-safe forwarding for spaces, quotes, Unicode, and exit codes, with no `Invoke-Expression`/string evaluation;
- resolve real executables with its own wrapper directory removed, prevent recursion, and fail closed when SFW is missing;
- test npm's `.cmd`/`.ps1` launchers and subprocess use, not just interactive commands;
- back up/merge settings and verify real Pi installer and shell-tool behavior on Windows before claiming parity.

## Report coverage honestly

Current status: macOS setup and mocked tests verified locally; Linux uses the same POSIX implementation and has a CI test matrix, but check the actual CI result and target machine before claiming it passed. Native Windows has guidance only, not tested shell-wrapper parity.

SFW Free is not a sandbox. It blocks confirmed malware; AI-flagged and unknown/unscanned packages may only warn or remain allowed. Public registries only, network checks only, no retrospective cache audit, and non-configurable telemetry. Absolute executable paths, changed PATH, project overrides, custom tools, and direct downloads can bypass this setup. Do not remove user caches or change registry/security policies without approval.
