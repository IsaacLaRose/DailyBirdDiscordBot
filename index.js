require("dotenv").config();

const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const { startScheduler } = require("./scheduler");
const fs = require("fs");
const path = require("path");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Register slash commands
  const rest = new REST().setToken(process.env.TOKEN_KEY);
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: client.commands.map((c) => c.data.toJSON()) }
  );
  console.log("✅ Slash commands registered");

  startScheduler(client);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const msg = { content: "Something went wrong.", ephemeral: true };
    interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
  }
});

client.login(process.env.TOKEN_KEY);