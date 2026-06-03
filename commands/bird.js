const { SlashCommandBuilder } = require("discord.js");
const { postBird, findPostChannel } = require("../scheduler");
const birds = require("../birds.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bird")
    .setDescription("Post a bird right now")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Specific bird name (optional — random if omitted)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const input = interaction.options.getString("name");
    const birdName = input ?? birds[Math.floor(Math.random() * birds.length)].name;

    try {
      await interaction.guild.channels.fetch();
      const channel = findPostChannel(interaction.guild);
      if (!channel) throw new Error("No suitable channel found.");
      await postBird(channel, birdName);
      await interaction.editReply("Posted.");
    } catch (err) {
      console.error("Command error:", err);
      await interaction.editReply("Could not fetch that bird. Try another name.");
    }
  },
};