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
        let userIndex = await db.getIndex(`/guilds[${guildIndex}]/users`, interaction.user.id);
        let path = `/guilds[${guildIndex}]/users[${userIndex}]`;
        let data = await db.getData(path);
        let content;
        if (data.counter > 0) {
          content = `いいすぎ回数${data.counter}回`;
          if (data.counter > 10) {
            content += `\nちょっといいすぎ多くなってきてない？`;
          } else if (data.counter > 30) {
            content += `\nちょっとくさくなってきたかも？`;
          } else if (data.counter > 50) {
            content += `\n...まだ間に合うからやめときな???`;
          } else if (data.counter > 100) {
            content += `\n...あなたは口くさすぎです。もう諦めてください`;
          }
        } else {
          content = 'まだいいすぎって言ってないみたい！健全です';
        }
        interaction.editReply({ content: content });
      } catch (error) {
        interaction.editReply({
          content: `まだいいすぎって言ってないみたい！健全です`,
        });
      }
    }
  },
};