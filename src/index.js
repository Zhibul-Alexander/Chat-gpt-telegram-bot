import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import { code } from "telegraf/format";
import config from "config";

import { ogg } from "./ogg.js";
import { openai } from "./openai.js";

const INITIAL_SESSION = {
  messages: [],
};

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"));

bot.use(session());

bot.command("new", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply("Waiting your voice or text message!");
});

bot.command("start", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply("Waiting your voice or text message!");
});

bot.on(message("voice"), async (ctx) => {
  ctx.session = ctx.session ?? INITIAL_SESSION;
  try {
    await ctx.reply(
      code("Message received. Waiting for a response from the server ...")
    );

    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = ctx.message.from.id.toString();
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);
    await ctx.reply(code(`Your response: ${text}`));

    ctx.session.messages.push({
      role: openai.roles.USER,
      content: text,
    });

    const response = await openai.chat(ctx.session.messages);

    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response,
    });

    await ctx.reply(response);
  } catch (e) {
    console.log("Error while voice message", e.message);
  }
});

bot.on(message("text"), async (ctx) => {
  ctx.session = ctx.session ?? INITIAL_SESSION;
  try {
    await ctx.reply(
      code("Message received. Waiting for a response from the server ...")
    );

    ctx.session.messages.push({
      role: openai.roles.USER,
      content: ctx.message.text,
    });

    const response = await openai.chat(ctx.session.messages);

    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response,
    });

    await ctx.reply(response);
  } catch (e) {
    console.log("Error while voice message", e.message);
  }
});

bot.launch().catch(console.error);

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));