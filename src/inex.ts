import bodyParser from "body-parser"
import express from "express"
import https from "https"
import { Context, Telegraf } from "telegraf"
import { Functions } from "./functions"

const CACHE_TIME = 86400

if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("Please add a bot token")
const bot: Telegraf = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

if (!process.env.URL_SHEET_JSON) throw new Error("Please add a URL GSheet")
const urlGSheet: string = process.env.URL_SHEET_JSON

if (!process.env.MSG_HELP) throw new Error("Please add a MSG HELP")
const msgHelp: string = process.env.MSG_HELP || "No está definido un mensaje de ayuda"

if (!process.env.DEBUG_ID) throw new Error("Please add a DEBUG ID")
const debugID: number = Number(process.env.DEBUG_ID)

const fns = new Functions()

bot.start(ctx => ctx.reply("Bienvenido a UOCxBot :)"))

bot.help(ctx => ctx.reply(msgHelp))

bot.hears(/(.+)/s, async (ctx) => {
    const inputTxt = fns.normalize(ctx.match[0])

    await https.get(urlGSheet, (res: any) => {
        const data: Uint8Array[] = []
        res.on('data', (chunk: Uint8Array) => data.push(chunk))
        res.on('end', () => {
            const subjects = fns.parseResJson2ArrayObjects(data)
            const subject = fns.findBestSubjectMatch(inputTxt, subjects)
            const msg = fns.parse2Msg(subject) ?? `No he encontrado ninguna coincidencia para "${inputTxt}"\n\n ${msgHelp}`
            ctx.reply(msg)
            fns.debugMsg({bot, query: ctx.message, response: msg, debugID})
        })
    })
})

bot.on("inline_query", async (ctx: Context) => {
    let inputQuery = ctx.inlineQuery?.query
    if (!inputQuery) {
        await ctx.answerInlineQuery([], {
            cache_time: CACHE_TIME,
        })
        return;
    }

    const queryNormalized = fns.normalize(inputQuery)

    await https.get(urlGSheet, (res: any) => {
        const data: Uint8Array[] = []
        res.on('data', (chunk: Uint8Array) => data.push(chunk))
        res.on('end', () => {
            const subjects = fns.parseResJson2ArrayObjects(data)
            let bestSubjects = fns.findMatchingSubjects(queryNormalized, subjects)
            bestSubjects = bestSubjects.sort((a, b) => b.rating - a.rating).slice(0, 5)
            const msg = fns.parseSubjects2InlineMsg(bestSubjects)
            ctx.answerInlineQuery(msg, { is_personal: false, cache_time: CACHE_TIME })
            fns.debugMsg({bot, query: inputQuery, response: JSON.stringify(msg), debugID})
        })
    })
})

bot.launch()

const app = express()
const port = process.env.PORT || 3333

app.use(bodyParser.json())
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }))
app.use(bodyParser.text({ type: "text/html" }))
app.get("/", async (req, res) => res.json({ Hello: "UOC" }))
app.listen(port, () => console.log(`App Listening Port: ${port}`))