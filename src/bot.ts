import express from "express";
import { Bot, webhookCallback } from "grammy";
import { GENERAL_GROUP, fetchDataFromGoogleSheets, findBestSubjectMatch, getAllSubjects, normalize, parse2Msg, parseUint8ArrayToSubjectArray } from "./functions";

const CACHE_TIME = 86400

const bot = new Bot(process.env.TELEGRAM_TOKEN || "");

if (!process.env.URL_SHEET_JSON_TG) throw new Error("Please add a URL Telegram GSheet")
const urlGSheetTg: string = process.env.URL_SHEET_JSON_TG
if (!process.env.URL_SHEET_JSON_WA) throw new Error("Please add a URL WhatsApp GSheet")
const urlGSheetWa: string = process.env.URL_SHEET_JSON_WA

if (!process.env.MSG_HELP) throw new Error("Please add a MSG HELP")
const msgHelp: string = process.env.MSG_HELP || "No está definido un mensaje de ayuda"

//if (!process.env.DEBUG_ID) throw new Error("Please add a DEBUG ID")
const debugID: number = Number(process.env.DEBUG_ID)

// Suggest commands in the menu
bot.api.setMyCommands([
  { command: "start", description: "Escribeme la asignatura y te devuelvo el link del grupo ;)" },
  {
    command: "tg_todos_es",
    description: "Lista de todos los grupos de Telegram",
  },
  {
    command: "tg_totes_cat",
    description: "Llista de tots els grups de Telegram",
  },
  /*{
    command: "wa_todos_es",
    description: "Lista de todos los grupos de WhatsApp",
  },*/
  {
    command: "wa_totes_cat",
    description: "Llista de tots els grups de WhatsApp",
  },
]);

// Handle the /yo command to greet the user
bot.command("start", (ctx) => ctx.reply(`Yo ${ctx.from?.username}`));

bot.command("tg_todos_es", async (ctx) => ctx.reply(await getAllSubjects('es', 'Telegram', urlGSheetTg), { parse_mode: "HTML", disable_web_page_preview: true }));
bot.command("tg_totes_cat", async (ctx) => ctx.reply(await getAllSubjects('cat', 'Telegram', urlGSheetTg), { parse_mode: "HTML", disable_web_page_preview: true }));
//bot.command("wa_todos_es", async (ctx) => ctx.reply(await getAllSubjects('es', 'WhatsApp'), { parse_mode: "HTML", disable_web_page_preview: true }));
bot.command("wa_totes_cat", async (ctx) => ctx.reply(await getAllSubjects('cat', 'WhatsApp', urlGSheetWa), { parse_mode: "HTML", disable_web_page_preview: true }));




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
/*
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
*/

bot.on("message", async (ctx) => {
  const message = ctx.message.text
  const normalizedMsg = message && normalize(message)

  const dataUint8Array = await fetchDataFromGoogleSheets(urlGSheetTg);
  const subjects = parseUint8ArrayToSubjectArray(dataUint8Array);

  const subjectMatch = findBestSubjectMatch(normalizedMsg, subjects);
  const { url: general } = findBestSubjectMatch(GENERAL_GROUP, subjects);


  const replyMsg = parse2Msg({ ...subjectMatch, general }, message) || `No he encontrado ninguna coincidencia para "${normalizedMsg}"\n\n ${msgHelp}`;
  ctx.reply(replyMsg, { parse_mode: "HTML"})

  if (debugID) {
    const debugMsg = {
      date: new Date().toLocaleString(),
      username: '@' + ctx.message.from?.username,
      message: ctx.message.text,
      search: normalizedMsg,
    }
    bot.api.sendMessage(debugID, JSON.stringify(debugMsg, null, 2));
  }
});

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
