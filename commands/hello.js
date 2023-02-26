const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Reply Hello!!'),
  async execute(interaction) {
    await interaction.reply('Fu●k!');
  },
};