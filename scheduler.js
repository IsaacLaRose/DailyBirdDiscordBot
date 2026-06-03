const cron = require("node-cron");
const { ChannelType } = require("discord.js");
const { promptBird } = require("./birds/prompter");
const { fetchWikiData, fetchBirdImage, fetchBirdSound } = require("./birds/fetcher");
const { buildEmbed } = require("./birds/embed");
const birds = require("./birds.json");

const PREFERRED_CHANNELS = ["bot", "bot-commands", "botcommands"];
const FALLBACK_CHANNEL = "general";

const used = new Set();

function pickBird() {
  const remaining = birds.filter((b) => !used.has(b.name));
  if (remaining.length === 0) used.clear();
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  used.add(pick.name);
  return pick.name;
}

/**
 * Finds the best text channel in a guild to post in.
 * Tries PREFERRED_CHANNELS in order, falls back to FALLBACK_CHANNEL.
 * Returns null if nothing is found.
 */
function findPostChannel(guild) {
  const textChannels = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me)?.has("SendMessages")
  );

  const byName = (name) =>
    textChannels.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;

  for (const name of PREFERRED_CHANNELS) {
    const match = byName(name);
    if (match) return match;
  }

  return byName(FALLBACK_CHANNEL);
}

async function postBird(channel, birdName = null) {
  const name = birdName ?? pickBird();
  console.log(`Fetching data for: ${name}`);

  try {
    const { extract, imageUrl: wikiImageUrl } = await fetchWikiData(name);

    const [birdData, imageUrl, sound] = await Promise.all([
      promptBird(name, extract),
      fetchBirdImage(name, wikiImageUrl).catch((err) => {
        console.error("Image error:", err.message);
        return wikiImageUrl;
      }),
      fetchBirdSound(name).catch((err) => {
        console.error("Sound error:", err.message);
        return null;
      }),
    ]);

    const embed = buildEmbed(birdData, imageUrl, sound);
    await channel.send({ embeds: [embed] });
    console.log(`Posted: ${birdData.name}`);
  } catch (err) {
    console.error(`Failed to post ${name}:`, err.message);
    if (!birdName) {
      console.log("Trying a different bird...");
      await postBird(channel);
    } else {
      throw err;
    }
  }
}

function startScheduler(client) {
  cron.schedule("0 9 * * *", async () => {
    const guilds = client.guilds.cache.values();

    for (const guild of guilds) {
      try {
        // Ensure the guild's channel list is populated
        await guild.channels.fetch();

        const channel = findPostChannel(guild);
        if (!channel) {
          console.warn(`[${guild.name}] No suitable channel found — skipping.`);
          continue;
        }

        console.log(`[${guild.name}] Posting to #${channel.name}`);
        await postBird(channel);
      } catch (err) {
        console.error(`[${guild.name}] Scheduler error:`, err);
      }
    }
  });

  if (process.env.NODE_ENV === "development") {
    client.guilds.cache.forEach(async (guild) => {
      try {
        await guild.channels.fetch();
        const channel = findPostChannel(guild);
        if (channel) {
          console.log(`[DEV][${guild.name}] Posting to #${channel.name}`);
          await postBird(channel);
        } else {
          console.warn(`[DEV][${guild.name}] No suitable channel found.`);
        }
      } catch (err) {
        console.error(`[DEV][${guild.name}] Error:`, err);
      }
    });
  }

  console.log("Bird scheduler running — posts at 9am daily");
}

module.exports = { startScheduler, postBird };