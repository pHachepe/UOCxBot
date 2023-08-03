import { findBestMatch } from "string-similarity"

// Delete Accents, etc
const normalize = (str: string) => str?.normalize("NFD")?.replace(/[\u0300-\u036f]/g, "").toUpperCase() || ''

const parseResJson2ArrayObjects = (data: readonly Uint8Array[]) => {
    // Invalid Json is received, it's necessary to remove 47 chars at the beginning and 2 at the end
    const subjectsTxt = Buffer.concat(data).toString().slice(47, -2)
    const subjectsJson = JSON.parse(subjectsTxt)

    const tableJson = subjectsJson.table
    const rowsJson = tableJson.rows

    let cellsJson = rowsJson.map((row: any) => row.c)
    cellsJson = cellsJson.slice(2) // Delete table headers

    let subjects = cellsJson.map((cells: any, id: number) => {
        const [cat, es, url] = cells.map((cell: any) => cell?.v)
        return { id, cat, es, url };
    })

    subjects = subjects.filter((subject: any) => subject.url) // Delete subjects without group url

    return subjects
}

const findBestSubjectMatch = (inputTxt: string, subjects: { id: number, es: string, cat: string, url: string }[]) => {
    const subjectsNamesEs = subjects.map(subject => normalize(subject.es))
    const subjectsNamesCat = subjects.map(subject => normalize(subject.cat))

    const matchesEs = findBestMatch(inputTxt, subjectsNamesEs)
    const matchesCat = findBestMatch(inputTxt, subjectsNamesCat)
    const bestMatches = matchesEs.bestMatch.rating >= matchesCat.bestMatch.rating ? matchesEs : matchesCat

    const subjectMatch = subjects[bestMatches.bestMatchIndex]

    return { ...subjectMatch, ...bestMatches.bestMatch }
}

const findMatchingSubjects = (inputTxt: string, subjects: { id: number, es: string, cat: string, url: string }[]) => {
    const subjectsNamesEs = subjects.map(subject => normalize(subject.es))
    const subjectsNamesCat = subjects.map(subject => normalize(subject.cat))

    const matchesEs = findBestMatch(inputTxt, subjectsNamesEs)
    const matchesCat = findBestMatch(inputTxt, subjectsNamesCat)

    const matchsEsCat = [...matchesEs.ratings, ...matchesCat.ratings]
    const topMatchesEsCat = matchsEsCat.filter(subject => subject.rating > 0).sort((a, b) => b.rating - a.rating)

    const topTargetsEsCat = topMatchesEsCat.map(m => m.target)

    const bestSubjectsEsCat = subjects.filter(
        subject => topTargetsEsCat.includes(normalize(subject.es))
            || topTargetsEsCat.includes(normalize(subject.cat))
    )

    const bestSubjectsEsCatWithRating = bestSubjectsEsCat.map(item => {
        let rating: any = topMatchesEsCat.find(m => m.target == normalize(item.es) || m.target == normalize(item.cat))
        rating = rating.rating
        return { ...item, rating }
    })

    return bestSubjectsEsCatWithRating
}

const parse2Msg = (subject: { id: number, es: string, cat: string, target: string, url: string, rating: number }) => {
    let msg = null

    if (subject.rating > 0)
        msg = ' Id: ' + subject.id
            + '\nEs: ' + subject.es
            + '\nCat: ' + subject.cat
            + '\nRating: ' + subject.rating.toFixed(2)
            + '\nGroup: ' + subject.url

    return msg
}

const parseSubjects2InlineMsg = (subjects: any[]) => {
    return subjects.map(parseSubject2InlineMsg)
}

const parseSubject2InlineMsg = (subject: any) => {
    let article = {
        type: "article",
        id: subject.id,
        title: subject.es + ' - Rating: ' + subject.rating.toFixed(2),
        input_message_content: {
            message_text: ' Id: ' + subject.id
                + '\nEs: ' + subject.es
                + '\nCat: ' + subject.cat
                + '\nRating: ' + subject.rating.toFixed(2)
                + '\nGroup: ' + subject.url
        },
        reply_markup: {
            inline_keyboard: [
                [
                    //Markup.button.url('Group 🧿', subject.url),
                    //Markup.button.url('General 🧜🏻', 'https://t.me/joinchat/U7otjvMzawEpEwe4'),
                    //Markup.button.url('UOCxBot 🤖', 'https://t.me/UOCxBot'),
                    // Markup.button.url('UOC ❤️', 'https://uoc.edu'),
                ]
            ]
        }
    }

    return article
}

/*const debugMsg = ({bot, query = 'Query Empty', response= 'Response Empty', debugID}: { bot, query: any, response: string, debugID: number }): void => {
    bot.telegram.sendMessage(debugID, "Mensaje: " + JSON.stringify(query));
    bot.telegram.sendMessage(debugID, "File content at: " + new Date() + " is: \n" + response);
}
*/
export { normalize, parseResJson2ArrayObjects, findBestSubjectMatch, findMatchingSubjects, parse2Msg, parseSubjects2InlineMsg, parseSubject2InlineMsg, debugMsg }