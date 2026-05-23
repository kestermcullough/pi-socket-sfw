# Socket Firewall Free notes

Source reviewed: <https://docs.socket.dev/docs/socket-firewall-free>

## What it does

Socket Firewall Free (`sfw`) is a no-API-key, zero-configuration network security proxy for package managers. It runs package manager commands with network traffic filtering:

```bash
sfw npm install
sfw pip install requests
```

## Installation

The simplest documented installation method is:

```bash
npm i -g sfw
```

Manual binaries are also available from the SocketDev/sfw-free GitHub releases. On macOS, unsigned binaries may require removing quarantine with `xattr -dr com.apple.quarantine ./path/to/sfw`.

## Supported package managers

Socket Firewall Free docs list these supported package managers:

- JavaScript/TypeScript: `npm`, `yarn`, `pnpm`
- Python: `pip`, `uv`
- Rust: `cargo`

## Verification

The docs show `sfw --help` output beginning with:

```text
Socket Firewall Free - Network security proxy for package managers
```

A safe wrapper smoke test is:

```bash
sfw npm --version
```

## Important limitations

- Wrapper mode only; use `sfw <package-manager> ...` or an interactive shell alias.
- Custom/private registries are not supported by the free version.
- Confirmed malware is blocked; AI-detected potential malware may warn but not block.
- Unknown/unscanned packages are not blocked by the free version.
- Telemetry is always enabled in the free version.
- Network connectivity is required.
- Cached artifacts may bypass network checks; clear package-manager caches if testing blocking behavior.
