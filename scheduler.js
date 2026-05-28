const cron = require("node-cron");
const { promptBird } = require("./birds/prompter");
const { fetchBirdImage, fetchBirdSound } = require("./birds/fetcher");
const { buildEmbed } = require("./birds/embed");
const birds = require("./birds.json");

const used = new Set();

function pickBird() {
  const remaining = birds.filter((b) => !used.has(b.name));
  if (remaining.length === 0) used.clear();
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  used.add(pick.name);
  return pick.name;
}

async function postBird(channel, birdName = null) {
  const name = birdName ?? pickBird();
  console.log(`Fetching data for: ${name}`);

  const [birdData, imageUrl, sound] = await Promise.all([
    promptBird(name),
    fetchBirdImage(name).catch((err) => { console.error("Image error:", err.message); return null; }),
    fetchBirdSound(name).catch((err) => { console.error("Sound error:", err.message); return null; }),
  ]);

  const embed = buildEmbed(birdData, imageUrl, sound);
  await channel.send({ embeds: [embed] });
  console.log(`Posted: ${birdData.name}`);
}

function startScheduler(client) {
  const CHANNEL_ID = process.env.CHANNEL_ID;

  cron.schedule("0 9 * * *", async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      await postBird(channel);
    } catch (err) {
      console.error("Scheduler error:", err);
    }
  });

  if (process.env.NODE_ENV === "development") {
    client.channels.fetch(CHANNEL_ID).then((channel) => postBird(channel));
  }

  console.log("Bird scheduler running — posts at 9am daily");
}

module.exports = { startScheduler, postBird };