import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

const {
  DISCORD_TOKEN,
  CHANNEL_ID,
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  STREAMERS,
  PING_ROLE_ID,
  POLL_SECONDS = "60",
  ANNOUNCE_ON_START = "false",
} = process.env;

for (const [k, v] of Object.entries({
  DISCORD_TOKEN,
  CHANNEL_ID,
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  STREAMERS,
})) {
  if (!v) {
    console.error(`Fehlende Umgebungsvariable: ${k}`);
    process.exit(1);
  }
}

const streamers = [
  ...new Set(
    STREAMERS.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  ),
].slice(0, 100); // Twitch erlaubt max. 100 pro Anfrage

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ---------- Twitch Auth ----------
let token = null;
let tokenExpires = 0;

async function getToken() {
  if (token && Date.now() < tokenExpires - 60_000) return token;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Twitch Auth fehlgeschlagen: ${res.status}`);
  const data = await res.json();
  token = data.access_token;
  tokenExpires = Date.now() + data.expires_in * 1000;
  return token;
}

async function fetchLiveStreams() {
  const params = new URLSearchParams();
  streamers.forEach((s) => params.append("user_login", s));
  params.set("first", "100");

  const doFetch = async () =>
    fetch(`https://api.twitch.tv/helix/streams?${params}`, {
      headers: {
        "Client-Id": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${await getToken()}`,
      },
    });

  let res = await doFetch();
  if (res.status === 401) {
    token = null; // Token neu holen und nochmal versuchen
    res = await doFetch();
  }
  if (!res.ok) throw new Error(`Twitch API Fehler: ${res.status}`);
  return (await res.json()).data;
}

// ---------- Announce-Logik ----------
// login -> { id: Stream-ID, misses: Anzahl Checks in Folge ohne Live-Status }
const announced = new Map();
let firstRun = true;

async function announce(stream) {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const url = `https://twitch.tv/${stream.user_login}`;

  const embed = new EmbedBuilder()
    .setColor(0x9146ff)
    .setTitle(stream.title || "Live auf Twitch")
    .setURL(url)
    .setAuthor({ name: `${stream.user_name} ist jetzt live!`, url })
    .addFields(
      { name: "Spiel", value: stream.game_name || "–", inline: true },
      { name: "Zuschauer", value: String(stream.viewer_count), inline: true }
    )
    .setImage(
      stream.thumbnail_url
        .replace("{width}", "1280")
        .replace("{height}", "720") + `?t=${Date.now()}`
    )
    .setTimestamp(new Date(stream.started_at));

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Stream ansehen")
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );

  const ping = PING_ROLE_ID ? `<@&${PING_ROLE_ID}> ` : "";
  await channel.send({
    content: `${ping}**${stream.user_name}** ist live! ${url}`,
    embeds: [embed],
    components: [button],
    allowedMentions: PING_ROLE_ID ? { roles: [PING_ROLE_ID] } : { parse: [] },
  });
  console.log(`Angekündigt: ${stream.user_login}`);
}

async function poll() {
  try {
    const live = await fetchLiveStreams();
    const liveLogins = new Set();

    for (const stream of live) {
      const login = stream.user_login.toLowerCase();
      liveLogins.add(login);
      const known = announced.get(login);

      if (known) {
        known.misses = 0;
        continue;
      }

      announced.set(login, { id: stream.id, misses: 0 });
      // Beim ersten Durchlauf bereits laufende Streams nicht neu ankündigen
      if (firstRun && ANNOUNCE_ON_START !== "true") continue;
      await announce(stream);
    }

    // Offline-Erkennung mit Toleranz (3 Checks), damit kurze Abbrüche
    // nicht zu doppelten Ankündigungen führen
    for (const [login, info] of announced) {
      if (!liveLogins.has(login)) {
        info.misses += 1;
        if (info.misses >= 3) announced.delete(login);
      }
    }
    firstRun = false;
  } catch (err) {
    console.error("Fehler beim Prüfen:", err.message);
  }
}

client.once("clientReady", () => {
  console.log(`Eingeloggt als ${client.user.tag}, überwache: ${streamers.join(", ")}`);
  poll();
  setInterval(poll, Math.max(30, Number(POLL_SECONDS)) * 1000);
});

client.login(DISCORD_TOKEN);
