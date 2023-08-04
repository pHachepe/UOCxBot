import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import express from "express";
import https from "https"
import { findBestSubjectMatch, findMatchingSubjects, normalize, parse2Msg, parseResJson2ArrayObjects, parseSubjects2InlineMsg } from "./functions";
import { InlineQueryResult } from "grammy/out/types.node";

const CACHE_TIME = 86400

// Create a bot using the Telegram token
const bot = new Bot(process.env.TELEGRAM_TOKEN || "");

if (!process.env.URL_SHEET_JSON) throw new Error("Please add a URL GSheet")
const urlGSheet: string = process.env.URL_SHEET_JSON

if (!process.env.MSG_HELP) throw new Error("Please add a MSG HELP")
const msgHelp: string = process.env.MSG_HELP || "No está definido un mensaje de ayuda"

if (!process.env.DEBUG_ID) throw new Error("Please add a DEBUG ID")
const debugID: number = Number(process.env.DEBUG_ID)

// Handle the /yo command to greet the user
//bot.command("yo", (ctx) => ctx.reply(`Yo ${ctx.from?.username}`));

//bot.command("effect", (ctx) => ctx.reply('Not implemented yet'));

// Suggest commands in the menu
/*
bot.api.setMyCommands([
  { command: "yo", description: "Be greeted by the bot" },
  {
    command: "effect",
    description: "Apply text effects on the text. (usage: /effect [text])",
  },
]);
*/
/*
// Handle the /about command
const aboutUrlKeyboard = new InlineKeyboard().url(
  "FAQ Ingeniería Informática",
  "https://sites.google.com/view/faq-enginyeria-informatica"
);

// Handle all other messages and the /start command
const introductionMessage = `Hello! I'm a Telegram bot.
I'm powered by Cyclic, the next-generation serverless computing platform.

<b>Commands</b>
/yo - Be greeted by me
/effect [text] - Show a keyboard to apply text effects to [text]`;

const replyWithIntro = (ctx: any) =>
  ctx.reply(introductionMessage, {
    reply_markup: aboutUrlKeyboard,
    parse_mode: "HTML",
  });
*/

//bot.command("start", replyWithIntro);
//bot.on("message", replyWithIntro);

bot.hears(/(.+)/s, async (ctx) => {
  const inputTxt = normalize(ctx.match[0])

  await https.get(urlGSheet, (res: any) => {
      const data: Uint8Array[] = []
      res.on('data', (chunk: Uint8Array) => data.push(chunk))
      res.on('end', () => {
          //const subjects = parseResJson2ArrayObjects(data)
          //const subject = findBestSubjectMatch(inputTxt, subjects)
          //const msg = parse2Msg(subject) ?? `No he encontrado ninguna coincidencia para "${inputTxt}"\n\n ${msgHelp}`
          //ctx.reply(msg)
          //debugMsg({bot, query: ctx.message, response: msg, debugID})
          ctx.reply('Hola: ' + JSON.stringify(inputTxt))
      })
  })
})

/*
bot.on("inline_query", async (ctx) => {
    let inputQuery = ctx.inlineQuery?.query;
    if (!inputQuery) {
      await ctx.answerInlineQuery([], {
        cache_time: CACHE_TIME,
      });
      return;
    }

    const queryNormalized = normalize(inputQuery);

    await https.get(urlGSheet, (res: any) => {
      const data: Uint8Array[] = [];
      res.on('data', (chunk: Uint8Array) => data.push(chunk));
      res.on('end', () => {
        const subjects = parseResJson2ArrayObjects(data);
        let bestSubjects = findMatchingSubjects(queryNormalized, subjects);
        bestSubjects = bestSubjects.sort((a, b) => b.rating - a.rating).slice(0, 5);
        const msg = parseSubjects2InlineMsg(bestSubjects);
        const inlineQueryResult: InlineQueryResult[] = msg.map((item) => {
          return {
            type: "article",
            id: item.id,
            title: item.title,
            input_message_content: {
              message_text: item.input_message_content.message_text,
              parse_mode: "HTML",
            },
            reply_markup: item.reply_markup,
            url: 'prueba URL',
            description: 'item.description',
          };
        });
        ctx.answerInlineQuery(inlineQueryResult, { is_personal: false, cache_time: CACHE_TIME });
        //debugMsg({ bot, query: inputQuery, response: JSON.stringify(msg), debugID });
      });
    });
})
*/
/*
// Handle inline queries
bot.inlineQuery(queryRegEx, async (ctx) => {
  const fullQuery = ctx.inlineQuery.query;
  const fullQueryMatch = fullQuery.match(queryRegEx);
  if (!fullQueryMatch) return;

  const effectLabel = fullQueryMatch[1];
  const originalText = fullQueryMatch[2];

  const effectCode = allEffects.find(
    (effect) => effect.label.toLowerCase() === effectLabel.toLowerCase()
  )?.code;
  const modifiedText = applyTextEffect(originalText, effectCode as Variant);

  await ctx.answerInlineQuery(
    [
      {
        type: "article",
        id: "text-effect",
        title: "Text Effects",
        input_message_content: {
          message_text: `Original: ${originalText}
Modified: ${modifiedText}`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().switchInline("Share", fullQuery),
        url: "http://t.me/EludaDevSmarterBot",
        description: "Create stylish Unicode text, all within Telegram.",
      },
    ],
    { cache_time: 30 * 24 * 3600 } // one month in seconds
  );
});
*/

// Return empty result list for other queries.
// bot.on("inline_query", (ctx) => ctx.answerInlineQuery([]));

// Start the server
if (process.env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
} else {
  // Use Long Polling for development
  bot.start();
}
