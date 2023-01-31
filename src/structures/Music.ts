import Client from './Client';
import CommandContext from './CommandContext';

import { User, Member, VoiceChannel, TextableChannel } from 'oceanic.js';
import { NodeOptions, Vulkava, Player } from 'vulkava';

import { Parser } from 'xml2js';

import { Timeouts, ComponentCollectors } from '../typings';
import Logger from '../utils/Logger';
import { dynamicAvatar } from '../utils/dynamicAvatar';

export default class Lavalink extends Vulkava {
  client: Client;
  channelTimeouts: Map<string, Timeouts>;
  searchCollectors: Map<string, ComponentCollectors>;

  private readonly log: Logger;

  constructor(client: Client, nodes: NodeOptions[]) {
    super({
      nodes,
      sendWS(id, payload) {
        const guild = client.guilds.get(id);
        if (guild) guild.shard.send(payload.op, payload.d);
      },
      spotify: {
        clientId: process.env.SPOTIFYCLIENTID,
        clientSecret: process.env.SPOTIFYCLIENTSECRET,
      }
    });

    this.client = client;
    this.channelTimeouts = new Map();
    this.searchCollectors = new Map();

    this.log = Logger.getLogger(this.constructor.name);

    this.on('nodeConnect', async (node): Promise<void> => {
      this.log.info(`${node.identifier} (ws${node.options.secure ? 's' : ''}://${node.options.hostname}:${node.options.port}) conectado!`);

      for (const player of [...this.players.values()].filter(p => p.node === node).values()) {
        const position = player.position;
        player.connect();
        player.play({ startTime: position });
      }
    });

    this.on('error', (node, error): void => {
      this.log.error(`Erro no ${node.identifier}: ${error.message}`);
    });

    this.on('warn', (node, warn) => {
      this.log.warn(`Aviso no ${node.identifier}: ${warn}`);
    })

    this.on('nodeDisconnect', (node, code, reason): void => {
      this.log.info(`O ${node.identifier} desconectou. Close code: ${code}. Reason: ${reason === '' ? 'Unknown' : reason}`);
    });

    this.on('trackStart', async (player, track): Promise<void> => {
      if (player.reconnect) {
        delete player.reconnect;
        return;
      }

      if (!player.textChannelId) return;

      const channel = this.client.getChannel(player.textChannelId);
      if (!channel || channel.type !== 0) return;

      if (player.lastPlayingMsgID) {
        channel.deleteMessage(player.lastPlayingMsgID).catch(() => { });
      }

      if (!channel.permissionsOf(this.client.user.id).has('SEND_MESSAGES')) {
        delete player.lastPlayingMsgID;
        return;
      }

      const requester = player.current?.requester as User;

      const embed = new this.client.embed()
        .setColor('RANDOM')
        .setTimestamp()
        .setFooter(`${requester.username}#${requester.discriminator}`, dynamicAvatar(requester));

      if (!player.radio) {
        embed.setTitle('<a:disco:803678643661832233> A Tocar')
          .addField(":page_with_curl: Nome:", '`' + track.title + '`')
          .addField(":robot: Enviado por:", '`' + track.author + '`')
          .addField(":watch: Duração:", '`' + this.client.utils.msToHour(track.duration) + '`')
          .setURL(track.uri)
          .setThumbnail(track.thumbnail!)
        player.lastPlayingMsgID = await channel.createMessage({ embeds: [embed] }).then(m => m.id);
      }
    });

    this.on('trackStuck', (player, track): void => {
      if (player.textChannelId) {
        const ch = this.client.getChannel(player.textChannelId) as TextableChannel;
        ch.createMessage({ content: `:x: Ocorreu um erro ao tocar a música ${track.title}.` });
        player.skip();
      }
      this.log.error(`Track Stuck on guild ${player.guildId}. Music title: ${track.title}`);
    });

    this.on('trackException', async (player, track, err): Promise<void> => {
      if (err && (err.message.includes('429') || err.message.includes('This video is not available'))) {
        const newNode = this.nodes.find(node => node.state === 1 && node !== player.node);

        if (newNode) {
          player.moveNode(newNode);
          return;
        }
      }

      if (player.textChannelId) {
        const ch = this.client.getChannel(player.textChannelId) as TextableChannel;
        ch.createMessage({ content: `:x: Ocorreu um erro ao tocar a música ${track.title}. Erro: \`${err.message}\`` });
      }
      this.log.error(`Track Error on guild ${player.guildId}: ${err.message}`);

      if (err.message.includes('Failed to resolve track')) {
        if (player.queue.size > 0)
          player.skip();
        else
          player.destroy();
        return;
      }

      if (player.errorCount === undefined) {
        player.errorCount = 0;
      } else ++player.errorCount;

      if (player.errorCount === 3) {
        const newNode = this.nodes.find(node => node.state === 1 && node !== player.node);

        if (newNode) {
          player.moveNode(newNode);
          return;
        }
      } else if (player.errorCount >= 10) {
        player.destroy();
        return;
      }

      if (player.queue.size > 0)
        player.skip();
      else
        player.destroy();
    });

    this.on('queueEnd', (player): void => {
      if (player.textChannelId) {
        const channel = this.client.getChannel(player.textChannelId);
        if (!channel || channel.type !== 0) return;

        if (player.lastPlayingMsgID) {
          channel.deleteMessage(player.lastPlayingMsgID).catch(() => { });
        }
        player.destroy();

        if (channel.permissionsOf(this.client.user.id).has('SEND_MESSAGES'))
          channel.createMessage({ content: `:bookmark_tabs: A lista de músicas acabou!` });
      }
    });

    this.on('recordFinished', (node, guildId, id) => {
      const rec = this.client.records.get(id);
      const player = this.players.get(guildId);

      if (rec && (!player || player.node === node)) {
        rec.onFinish(rec.oldCtx, rec.newCtx ?? null, node, id);
      }
    });
  }

  async hasDJRole(member: Member): Promise<boolean> {
    const guildData = this.client.guildCache.get(member.guild.id);

    if (guildData && guildData.djRole) {
      const djRoleID = guildData.djRole;
      const djRole = member.guild.roles.get(djRoleID);

      if (!djRole) {
        guildData.djRole = '';
        const guildDBData = await this.client.guildDB.findOne({ guildID: member.guild.id });

        if (guildDBData) {
          guildDBData.djrole = '';
          guildDBData.save();
        }
        return false;
      }

      if (member?.roles.find(r => r === djRoleID)) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  }

  canPlay(ctx: CommandContext, player?: Player | undefined): boolean {
    const voiceChannelID = ctx.member!.voiceState!.channelID;

    if (!voiceChannelID) {
      ctx.sendMessage({ content: ':x: Precisas de estar num canal de voz para executar esse comando!', flags: 1 << 6 });
      return false;
    }

    if (this.client.records.has(voiceChannelID)) {
      ctx.sendMessage({ content: ':x: Não consigo tocar música enquanto gravo áudio!', flags: 1 << 6 });
      return false;
    }

    const voiceChannel = this.client.getChannel(voiceChannelID) as VoiceChannel;

    const permissions = voiceChannel.permissionsOf(this.client.user.id);

    if (!permissions.has('VIEW_CHANNEL')) {
      ctx.sendMessage({ content: ':x: Não tenho permissão para ver o teu canal de voz!', flags: 1 << 6 });
      return false;
    }

    if (!permissions.has('CONNECT')) {
      ctx.sendMessage({ content: ':x: Não tenho permissão para entrar no teu canal de voz!', flags: 1 << 6 });
      return false;
    }

    if (!permissions.has('SPEAK')) {
      ctx.sendMessage({ content: ':x: Não tenho permissão para falar no teu canal de voz!', flags: 1 << 6 });
      return false;
    }

    if (player && voiceChannelID !== player.voiceChannelId) {
      ctx.sendMessage({ content: ':x: Precisas de estar no meu canal de voz para usar este comando!', flags: 1 << 6 });
      return false;
    }

    if (player && !player.radio && player.queueDuration > 8.64e7) {
      ctx.sendMessage({ content: ':x: A queue tem a duração superior a 24 horas!', flags: 1 << 6 })
      return false;
    }
    return true;
  }

  async getRadioNowPlaying(radio: string) {
    let artist, songTitle;
    const xmlParser = new Parser();

    const lcRadio = radio.toLowerCase();

    if (['CidadeHipHop', 'CidadeFM', 'RadioComercial', 'M80'].includes(radio)) {
      const xml = await fetch(`https://${lcRadio.startsWith('cidade') ? 'cidade' : lcRadio}.iol.pt/nowplaying${radio === 'CidadeHipHop' ? '_Cidade_HipHop' : ''}.xml`).then(r => r.text());

      const text = await xmlParser.parseStringPromise(xml).then(t => t.RadioInfo.Table[0]);

      artist = text['DB_DALET_ARTIST_NAME'][0];
      songTitle = text['DB_DALET_TITLE_NAME'][0];
    } else if (radio === 'RFM') {
      const xml = await fetch('https://configsa01.blob.core.windows.net/rfm/rfmOnAir.xml')
        .then(async r => Buffer.from(await r.arrayBuffer()).toString('utf16le'));

      const text = await xmlParser.parseStringPromise(xml).then(parsed => parsed.music.song[0]);

      artist = text.artist[0];
      songTitle = text.name[0];
    }

    return { artist, songTitle };
  }

  init() {
    return super.start(this.client.user.id);
  }
}
