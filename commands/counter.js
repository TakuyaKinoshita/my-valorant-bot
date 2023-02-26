const { SlashCommandBuilder } = require('discord.js');
const {JsonDB, Config} = require('node-json-db')
const db = new JsonDB(new Config("usersDataBase", true, false, '/'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('counter')
    .setDescription('いろんなカウンターを準備する予定だよ〜')
    .addSubcommand(subcommand =>
      subcommand
        .setName('iisugi')
        .setDescription('いいすぎの回数数えてるからね！！いいすぎだよ！！')
        .addBooleanOption(option =>
          option
            .setName('ephemeral')
            .setDescription('true => 周りに非表示、false => 全員に公開'))),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'iisugi') {
      await interaction.deferReply({ ephemeral: interaction.options.getBoolean('ephemeral') ?? false });
      try {
        let guildIndex = await db.getIndex("/guilds", interaction.guildId);
        let userIndex = await db.getIndex(`/guilds[${guildIndex}]/users`, message.author.id);
        let path = `/guilds[${guildIndex}]/users[${userIndex}]`;
        let data = await db.getData(path);
        interaction.editReply({
          content: `いいすぎ回数`,
        });
      } catch (error) {
        interaction.editReply({
          content: `まだいいすぎって言ってないみたい！健全です`,
        });
      }
    }
  },
};