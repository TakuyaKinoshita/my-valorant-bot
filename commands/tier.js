const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const HenrikDevValorantAPI = require('unofficial-valorant-api');
const VAPI = new HenrikDevValorantAPI();
const Canvas = require('@napi-rs/canvas');
const { request } = require('undici');
const axios = require('axios');
const { join } = require('path')
Canvas.GlobalFonts.registerFromPath(join(__dirname, '..', 'font', 'FontsFree-Net-Tungsten-Bold.ttf'), 'Tungsten-Bold');
// console.info(Canvas.GlobalFonts.families)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tier')
    .setDescription('VALORANTのティアに関連するスラッシュコマンド。サブコマンドも拡張予定')
    .addSubcommand(subcommand =>
      subcommand
        .setName('current')
        .setDescription('現在のティアを表示します.エロさも測れます')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('valorantのプレイヤーネームを入力してください')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('tag')
            .setDescription('valorantのプレイヤータグを入力して下しさい')
            .setRequired(true))
        .addBooleanOption(option =>
          option
            .setName('ephemeral')
            .setDescription('true => 周りに非表示、false => 全員に公開'))
        .addStringOption(option =>
          option
            .setName('region')
            .setDescription('違うサーバーのアカウントを表示したいときはここを変える')
            .addChoices(
              { name: 'ヨーロッパ', value: 'eu' },
              { name: '北アメリカ', value: 'na' },
              { name: '韓国', value: 'kr' },
              { name: 'アジア太平洋', value: 'ap' },
              { name: 'ラテンアメリカ', value: 'latam' },
              { name: 'ブラジル', value: 'br' },
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('img')
        .setDescription('valorant風のティア画像メーカー')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('valorantのプレイヤーネームを入力してください')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('tag')
            .setDescription('valorantのプレイヤータグを入力してください')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('orientation')
            .setDescription('生成画像の向きを指定')
            .addChoices(
              { name: '縦向き', value: 'vertical' },
              { name: '横向き', value: 'horizontal' },
            )
            .setRequired(true))
        .addBooleanOption(option =>
          option
            .setName('ephemeral')
            .setDescription('true => 周りに非表示、false => 全員に公開')))
    // .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'current') {
      await interaction.deferReply({ ephemeral: interaction.options.getBoolean('ephemeral') ?? false });
      const mmr_data = await VAPI.getMMR({
        version: 'v1',
        region: interaction.options.getString('region') ?? 'ap',
        name: interaction.options.getString('name'),
        tag: interaction.options.getString('tag'),
      });
      if (mmr_data.error)
        return interaction.editReply({
          content: `Error ${mmr_data.status}: \n\`\`\`${JSON.stringify(mmr_data.error)}\`\`\``,
        });
      interaction.editReply({
        content: `[${mmr_data.data.currenttierpatched}] - ${mmr_data.data.elo} ELO`,
      });
    } else if (interaction.options.getSubcommand() === 'img') {
      await interaction.deferReply({ ephemeral: interaction.options.getBoolean('ephemeral') ?? false });

      // get player data from VAPI
      const account_data = await VAPI.getAccount({
        name: interaction.options.getString('name'),
        tag: interaction.options.getString('tag'),
      });
      if (account_data.error)
        return interaction.editReply({
          content: `Error ${account_data.status}: \n\`\`\`${JSON.stringify(account_data.error)}\`\`\``,
        });

      // get conpetive data from valorant api
      const competitivetiers_data = await axios.get('https://valorant-api.com/v1/competitivetiers');
      if (competitivetiers_data.error)
        return interaction.editReply({
          content: `Error ${competitivetiers_data.status}: \n\`\`\`${JSON.stringify(competitivetiers_data.error)}\`\`\``,
        });

      // get mmr data from VAPI
      const mmr_data = await VAPI.getMMR({
        version: 'v1',
        region: account_data.data.region ?? 'ap',
        name: interaction.options.getString('name'),
        tag: interaction.options.getString('tag'),
      });
      if (mmr_data.error)
        return interaction.editReply({
          content: `Error ${mmr_data.status}: \n\`\`\`${JSON.stringify(mmr_data.error)}\`\`\``,
        });
      
      const applyText = (canvas, text) => {
      	const context = canvas.getContext('2d');
      	// Declare a base size of the font
      	let fontSize = 70;
      	do {
      		// Assign the font to the context and decrement it so it can be measured again
      		context.font = `400 ${fontSize -= 5}px Tungsten-Bold`;
      		// Compare pixel width of the text to the canvas minus the approximate avatar size
      	} while (context.measureText(text).width > canvas.width - 300);
      	// Return the result to use in the actual canvas
      	return context.font;
      };

      // Pass the entire Canvas object because you'll need access to its width and context
      let canvasSizeX;
      let canvasSizeY;
      let background;

      // create canvas by orientation
      if (interaction.options.getString('orientation') === 'vertical') {
        canvasSizeX = 268;
        canvasSizeY = 640;
        background = await Canvas.loadImage(`${account_data.data.card.large}`);
      } else if (interaction.options.getString('orientation') === 'horizontal') {
        canvasSizeX = 452;
        canvasSizeY = 128;
        background = await Canvas.loadImage(`${account_data.data.card.wide}`);
      }
      const canvas = Canvas.createCanvas(canvasSizeX, canvasSizeY);
      const context = canvas.getContext('2d');
      context.drawImage(background, 0, 0, canvas.width, canvas.height);

      // begin canvas path
      context.strokeRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      
      // Transform the image into a circle
      if (interaction.options.getString('orientation') === 'vertical') {
        context.arc(70, 70, 40, 0, Math.PI * 2, true);
      } else if (interaction.options.getString('orientation') === 'horizontal') {
        context.arc(65, 65, 40, 0, Math.PI * 2, true);
      }

      //　Generate text output area
      context.fillStyle = "rgba(81,82,84,0.7)";
      if (interaction.options.getString('orientation') === 'vertical') {
        context.rect(50, 50, 75, 50);
        context.fillRect(50, 50, 75, 50);
      } else if (interaction.options.getString('orientation') === 'horizontal') {
        context.rect(130, 14, 300, 100);
        context.fillRect(130, 14, 300, 100);
      }
      context.clip();

      // close canvas path
      context.closePath();
      context.stroke();

      // get Discord avatar image url
      const { body } = await request(interaction.user.displayAvatarURL({ extension: 'jpg' }));
      const avatar = await Canvas.loadImage(await body.arrayBuffer());

      // set avatar image
      if (interaction.options.getString('orientation') === 'vertical') {
        context.drawImage(avatar, 30, 30, 80, 80);
      } else if (interaction.options.getString('orientation') === 'horizontal') {
        context.drawImage(avatar, 25, 25, 80, 80);
      }

      // get competitive image url
      // https://qiita.com/kerupani129/items/64ce1e80eb8efb4c2b21
      const tier_image = await Canvas.loadImage(`${competitivetiers_data.data.data.slice(-1)[0].tiers[mmr_data.data.currenttier].smallIcon}`);
      const tier_text = mmr_data.data.currenttierpatched;

      // set competitive image
      if (interaction.options.getString('orientation') === 'vertical') {
        context.drawImage(tier_image, 30, 30, 80, 80);
      } else if (interaction.options.getString('orientation') === 'horizontal') {
        context.drawImage(tier_image, 140, 14, 50, 50);
      }

      // set competitive tier text
    	context.font = '400 42px Tungsten-Bold,arial,georgia,sans-serif';
    	context.fillStyle = '#ffffff';
    	context.fillText(`${tier_text}`, 200, 56);

      // set player name with tag
      context.font = applyText(canvas, `${interaction.options.getString('name')}#${interaction.options.getString('tag')}`);
	    context.fillStyle = '#ffffff';
      context.fillText(`${interaction.options.getString('name')}#${interaction.options.getString('tag')}`, 200, 98);
      
      // Reply image data
      const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'valorant-profile.png' });
      return interaction.editReply({ files: [attachment] });
    } else {
      return interaction.reply({ content: `どしたん！！そんなコマンドないで？！` });
    }
  }
};