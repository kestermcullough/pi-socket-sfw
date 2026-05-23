---
name: socket-sfw
description: Install, enable, and verify Socket Firewall Free (sfw) so supported package managers are run through sfw aliases. Use when setting up or checking sfw aliases for npm, yarn, pnpm, pip, uv, or cargo.
compatibility: macOS/Linux shell setup with npm available and network access for npm i -g sfw.
---

# Socket SFW

Use this skill when the user wants Socket Firewall Free (`sfw`) installed and package-manager commands routed through it by shell aliases.

Socket's docs say Socket Firewall Free is zero-config, supports `npm`, `yarn`, `pnpm`, `pip`, `uv`, and `cargo`, and works in wrapper mode by prefixing commands such as `sfw npm install` or `sfw pip install requests`. See [the local summary](references/socket-firewall-free.md) for notes from the docs.

## Install or refresh aliases

From this skill directory, run:

```bash
scripts/install-sfw-aliases.sh
```

The script:

1. Runs `npm i -g sfw` using the real `npm` binary.
2. Adds an idempotent managed alias block to common interactive shell startup files.
3. Verifies `sfw --help` and checks aliases in available interactive shells.

Managed aliases:

```bash
alias npm="sfw npm"
alias yarn="sfw yarn"
alias pnpm="sfw pnpm"
alias pip="sfw pip"
alias uv="sfw uv"
alias cargo="sfw cargo"
```

Open a new terminal or source the updated shell file (for example, `source ~/.zshrc`) before expecting aliases in the current shell.

## Verify only

```bash
scripts/install-sfw-aliases.sh --verify-only
```

Expected verification signals:

- `sfw --help` prints `Socket Firewall Free - Network security proxy for package managers`.
- In an interactive shell, `alias npm` prints `npm='sfw npm'` (format varies by shell).
- `npm --version` from a newly opened interactive shell runs through the alias.

## Notes

- Shell aliases affect interactive shells. Non-interactive scripts and tool calls should explicitly run `sfw npm ...`, `sfw uv ...`, etc.
- To bypass an alias for one command, use `command npm ...` (or the full executable path).
- Socket Firewall Free requires network connectivity and does not support private/custom registries.
