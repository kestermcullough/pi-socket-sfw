# pi-socket-sfw

A [Pi](https://pi.dev) skill for [Socket Firewall Free](https://docs.socket.dev/docs/socket-firewall-free) (`sfw`). Protect supported package-manager commands without remembering a prefix, including Pi's non-interactive Bash tool and npm package installer.

## Install in Pi

```bash
pi install git:github.com/kestermcullough/pi-socket-sfw
```

Restart Pi or `/reload` to discover the skill, then ask:

```text
/skill:socket-sfw protect Pi's Bash commands and package installer
```

Installing this skill alone does **not** change security settings or install SFW. Review the script before running it.

## Platforms and agent guidance

Read [the cross-platform runbook](skills/socket-sfw/references/platform-setup.md) before setup, whether using Pi, another agent, or a standalone shell.

| Environment | Current support |
| --- | --- |
| macOS | Automatic setup; verified locally |
| Linux | Same POSIX setup; Linux/macOS mocked-test CI matrix added; verify actual CI/target results |
| Windows via WSL | Run Linux Node/Pi/SFW inside WSL and follow Linux steps; separate settings from native Windows |
| Native Windows | Manual installer-only guidance; automatic shell wrappers are not implemented or validated |

The POSIX installer refuses Windows Node (including Git Bash) before making changes. Native Windows guidance explains SFW installation, a conditional `npmCommand` configuration, verification, and the remaining protection gap. Do not claim cross-platform parity from passing macOS tests.

## Setup

Requires macOS/Linux, Node.js, Bash, and `sfw` on PATH. If SFW is missing, review and install it from Socket's official distribution first. Initial installation of SFW is a bootstrap trust step, not protected by SFW itself.

From this repository:

```bash
node skills/socket-sfw/scripts/setup-pi-sfw.mjs
node skills/socket-sfw/scripts/setup-pi-sfw.mjs --verify-only
```

The setup script:

- Creates executable wrappers for `npm`, `npx`, `yarn`, `pnpm`, `pip`, `pip3`, `uv`, and `cargo` in `~/.local/share/socket-sfw/bin`.
- Prepends that directory using Pi's global `shellCommandPrefix`, keeping any existing prefix.
- Sets Pi's global `npmCommand` to the protected npm wrapper, so package lookups/installations/updates use SFW even without a shell.
- Preserves other settings, makes timestamped backups, and atomically writes JSON. Honors `PI_CODING_AGENT_DIR` for custom Pi configurations.
- Verifies SFW, the installer wrapper, and a non-interactive Bash command. Verification uses version commands, not package downloads.

**Restart Pi after setup.** Existing processes and other applications do not inherit this change automatically. Project settings can override global Pi settings.

### Recursion and failures

Wrappers remove their own directory from PATH and resolve the real manager and SFW before calling `sfw /absolute/path/to/manager ...`. This prevents recursive wrapping and follows the currently active Node/Python environment rather than pinning an NVM version. Missing SFW or a manager produces an error; there is no unfiltered fallback. SFW's exit status is preserved. Empty and `.` PATH entries are omitted during resolution.

### Terminal and CI use

The Pi Bash prefix covers Pi tool calls, not all shells system-wide. Other scripts can opt into the same wrappers:

```bash
export PATH="$HOME/.local/share/socket-sfw/bin:$PATH"
npm install
uv sync
```

The older interactive-alias installer remains available:

```bash
bash skills/socket-sfw/scripts/install-sfw-aliases.sh
```

Aliases alone do not cover Pi's installer or non-interactive shells. Do not combine aliases with wrappers unnecessarily: that can run SFW twice.

## Security boundary

This is a convenience/security layer, **not a sandbox or tamper-proof policy**:

- SFW filters supported public package-registry traffic; it does not secure arbitrary Bash commands, `curl | sh`, Git clones, local dependencies, or all installation hooks.
- Private/custom registries are not supported by Socket Firewall Free. Existing caches or installed packages are not retrospectively audited by this setup.
- Free blocks confirmed malware, but AI-flagged and unknown/unscanned packages may only warn or remain allowed. Its telemetry cannot be disabled.
- Absolute executable paths, PATH changes, project overrides, or editing settings/wrappers can bypass it. An existing shell prefix that replaces PATH may also override protection.
- Child processes inside SFW receive the cleaned PATH to avoid recursion; do not assume nested package-manager launches get a second firewall wrapper.
- Tools/extensions launching processes themselves may not use Pi's Bash prefix. SDK clients and subagents must inherit/load the relevant settings; verify their actual runtime configuration.
- Preserve existing package-age restrictions and lockfiles. For stronger enforcement, use OS/network controls, isolation, or an organization-managed firewall.

No claim of protecting every package download is made. Setup replaces any custom `npmCommand`; consult the backup before restoring or adapting an existing custom installer.

## Tests

```bash
node --test tests/*.test.mjs
```

Tests use fake package managers/SFW and require no network. They check config preservation, repeat runs, quoting, argument forwarding, non-interactive Bash, installer invocation, recursion avoidance, and fail-closed behavior.

## Undo

Restore the pre-setup settings backup (or remove the managed PATH prefix and restore your previous `npmCommand`). Remove `~/.local/share/socket-sfw/bin` only after removing references to it. This does not uninstall SFW or remove separately installed shell aliases.
