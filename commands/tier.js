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

      // get competitive image url
      // https://qiita.com/kerupani129/items/64ce1e80eb8efb4c2b21
      const tier_image = await Canvas.loadImage(`${competitivetiers_data.data.data.slice(-1)[0].tiers[mmr_data.data.currenttier].largeIcon}`);
      const tier_text = mmr_data.data.currenttierpatched;
      
      const applyText = (canvas, text, maxWidth = canvas.width, base = 70) => {
      	const context = canvas.getContext('2d');
      	// Declare a base size of the font
      	let fontSize = base;
      	do {
      		// Assign the font to the context and decrement it so it can be measured again
      		context.font = `${fontSize -= 1}px`;
      		// Compare pixel width of the text to the canvas minus the approximate avatar size
      	} while (context.measureText(text).width > maxWidth);
      	// Return the result to use in the actual canvas
      	return fontSize;
      };

      // canvasの基本設定
      let x = 0;    //左上の頂点x座標
      let y = 0;    //左上の頂点y座標
      let w;        //横の長さ
      let h;  //縦の長さ
      let r　= 19;   //角丸の半径
      // let strokeStyleColor = "rgba(236,232,225,1)";  //塗りつぶし色
      let strokeStyleColor = "rgb(255, 70, 85)";  //塗りつぶし色
      let textAreaFillColor = "rgba(81,82,84,0.5)";  //塗りつぶし色
      let background;　　// 背景バナー画像

      if (interaction.options.getString('orientation') === 'vertical') {
        w = 268;
        h = 640;
        background = await Canvas.loadImage(`${account_data.data.card.large}`);
        return interaction.editReply({ content: "準備中です！" });
      } else if (interaction.options.getString('orientation') === 'horizontal') {
        w = 452;
        h = 128;
        background = await Canvas.loadImage(`${account_data.data.card.wide}`);
        const canvas = Canvas.createCanvas(w, h);
        const context = canvas.getContext('2d');
        
        // begin canvas path
        context.clearRect(0,0,canvas.width,canvas.height);
        context.lineWidth = 3;
        context.strokeStyle = strokeStyleColor;
        context.fillStyle = "rgba(255,255,255,0.1)";
        context.moveTo(x+r, y);
        context.lineTo(w-r,y);
        context.arcTo(w,y,w,y+r,r);
        context.lineTo(w,h-r);
        context.arcTo(w,h,w-r,h,r);
        context.lineTo(x+r,h);
        context.arcTo(x,h,x,h-r,r);
        context.lineTo(x,y+r)
        context.arcTo(x,y,x+r,y,r);
        context.fill();
        context.stroke();

        // draw background image
        context.drawImage(background, 0, 0, canvas.width, canvas.height);

        // draw text area background
        context.beginPath();
        context.fillStyle = textAreaFillColor;
        context.moveTo(200,h/2);
        context.lineTo(150,h);
        context.lineTo(w,h);
        context.lineTo(w,h/2);
        context.lineTo(250,h/2);
        context.closePath();
        context.fill();

        // draw line
        context.beginPath();
        context.fillStyle = "#0f1923";
        context.moveTo(x,h/6*5);
        context.lineTo(w,h/6*5);
        context.lineTo(w,h);
        context.lineTo(x,h);
        context.lineTo(x,h/6*5);
        context.closePath();
        context.fill();
        
        // draw avatar image background
        context.beginPath();
        context.fillStyle = "rgba(255, 70, 85)";
        context.lineTo(130,y);
        context.lineTo(70,h);
        context.lineTo(x,h);
        context.lineTo(x,y);
        context.closePath();
        context.fill();

        let base = 20;
        context.beginPath();
        context.fillStyle = "#0f1923";
        context.lineTo(base,y);
        context.lineTo(base-50,h);
        context.lineTo(-50-base,h);
        context.lineTo(x,y);
        context.closePath();
        context.fill();
        
        // set avatar image
        context.drawImage(tier_image, 13, 45, 60, 60);
        
        // set competitive tier text
        let tierSize = applyText(canvas, `${tier_text.toUpperCase()}`, 150)
        context.textAlign = 'left';
        context.textBaseline = 'middle';
      	context.font = `400 ${tierSize}px Tungsten-Bold`;
      	context.fillStyle = '#ece8e1';
        let tierWidth = context.measureText(`${tier_text.toUpperCase()}`).width;
      	context.fillText(`${tier_text.toUpperCase()}`, 13, 45/2);
        
        // set player name with tag
        let text = `${interaction.options.getString('name')}#${interaction.options.getString('tag')}`;
        let size = applyText(canvas, text, w-80, 50);
        context.font = `400 ${size} Tungsten-Bold`;
        context.textAlign = 'left';
        context.textBaseline = 'middle';
  	    context.fillStyle = "rgba(255, 70, 85)";
        let textWidth = context.measureText(`${interaction.options.getString('name')}`).width;
        context.fillText(`${interaction.options.getString('name')}`, 200, 90);
        context.fillStyle = '#ece8e1';
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.font = `400 ${size - 2}px Tungsten-Bold`;
        context.fillText(`#${interaction.options.getString('tag')}`, 200+textWidth, 90);
        
        // Reply image data
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'valorant-profile.png' });
        return interaction.editReply({ files: [attachment] });
      }


      
    } else {
      return interaction.reply({ content: `どしたん！！そんなコマンドないで？！` });
    }
  }
};