const { EmbedBuilder } = require("discord.js");

function buildEmbed(bird, imageUrl, sound) {
  const embed = new EmbedBuilder()
    .setTitle(`Bird of the Day: ${bird.name}`)
    .setColor(0xe8a838)
    .addFields(
      {
        name: "Sounds like",
        value: `*"${bird.callDescription}"*`,
        inline: false,
      },
      { name: "Fun Fact", value: bird.funFact, inline: false },
      {
        name: "Favorite Foods",
        value: bird.favoriteFoods.map((f) => `• ${f}`).join("\n"),
        inline: true,
      },
      { name: "Vibe", value: bird.vibe, inline: true }
    )
    .setFooter({ text: "Daily Bird Drop" })
    .setTimestamp();

  if (imageUrl) embed.setImage(imageUrl);

  if (sound) {
    embed.addFields({
      name: "Hear it",
      value: `[Listen on xeno-canto](${sound.pageUrl}) · [Direct MP3](${sound.fileUrl})\n Recorded in ${sound.country} by ${sound.recordist}`,
      inline: false,
    });
  }

  return embed;
}

module.exports = { buildEmbed };