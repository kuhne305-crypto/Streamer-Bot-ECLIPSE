[README.md](https://github.com/user-attachments/files/32771618/README.md)
# Twitch Stream-Announce-Bot für Discord (Railway)

Postet eine Ankündigung, sobald einer der eingetragenen Streamer live geht.

## 1. Discord-Bot erstellen
1. https://discord.com/developers/applications → **New Application**
2. Tab **Bot** → **Reset Token** → Token kopieren (`DISCORD_TOKEN`)
3. Tab **OAuth2 → URL Generator**: Scope `bot`, Rechte `View Channels`, `Send Messages`, `Embed Links`
4. Generierte URL öffnen und den Bot auf deinen Server einladen

## 2. Twitch-App erstellen
1. https://dev.twitch.tv/console/apps → **Register Your Application**
2. OAuth Redirect URL: `http://localhost`, Kategorie: `Application Integration`
3. **Client ID** und **Client Secret** kopieren

## 3. IDs holen
In Discord unter Einstellungen → Erweitert den **Entwicklermodus** aktivieren. Dann Rechtsklick auf den
Ankündigungs-Channel → **Channel-ID kopieren** (`CHANNEL_ID`). Optional Rechtsklick auf eine Rolle →
**Rollen-ID kopieren** (`PING_ROLE_ID`).

## 4. Auf Railway deployen
1. Code in ein GitHub-Repo pushen (`index.js`, `package.json`)
2. Railway → **New Project → Deploy from GitHub repo**
3. Tab **Variables** → diese Werte eintragen:

| Variable | Beispiel | Pflicht |
|---|---|---|
| `DISCORD_TOKEN` | `MTIz...` | ja |
| `CHANNEL_ID` | `123456789012345678` | ja |
| `TWITCH_CLIENT_ID` | `abc123...` | ja |
| `TWITCH_CLIENT_SECRET` | `xyz789...` | ja |
| `STREAMERS` | `shroud,gronkh,papaplatte` | ja (kommagetrennt, beliebig viele, 10 sind kein Problem) |
| `PING_ROLE_ID` | `123456789012345678` | nein |
| `POLL_SECONDS` | `60` | nein (min. 30) |
| `ANNOUNCE_ON_START` | `false` | nein |

Railway startet den Bot automatisch mit `npm start`.

## Hinweise
- Streamer hinzufügen/entfernen: Variable `STREAMERS` ändern, Railway startet neu.
- Beim Start werden bereits laufende Streams **nicht** erneut angekündigt (außer `ANNOUNCE_ON_START=true`).
- Ein Stream wird pro Session nur einmal gepostet; kurze Verbindungsabbrüche (< ca. 3 Min.) zählen nicht als neuer Stream.
- Geht jemand live, während der Bot gerade neu startet, kann diese Ankündigung ausfallen.
