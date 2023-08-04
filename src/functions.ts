import https from "https";
import { findBestMatch } from "string-similarity";

const GENERAL_GROUP = 'Grupo General de Telegram'
// Delete Accents, etc
const normalize = (str: string) => str?.normalize("NFD")?.replace(/[\u0300-\u036f]/g, "").toUpperCase() || ''

// Obtiene los datos de Google Sheets y devuelve una promesa con la data en un array de Uint8Array
async function fetchDataFromGoogleSheets(): Promise<Uint8Array[]> {
  if (!process.env.URL_SHEET_JSON) throw new Error("Please add a URL GSheet")
  const urlGSheet: string = process.env.URL_SHEET_JSON
  return new Promise((resolve, reject) => {
    https.get(urlGSheet, (res) => {
      const { statusCode } = res;

      if (statusCode !== 200) {
        reject(new Error(`La solicitud falló con el código de estado: ${statusCode}`));
        return;
      }

      const data: Uint8Array[] = [];
      res.on('data', (chunk: Uint8Array) => data.push(chunk));
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

const parseUint8Array2ArraySubjects = (data: readonly Uint8Array[]) => {
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

const findBestSubjectMatch = (inputTxt: string = GENERAL_GROUP, subjects: { id: number, es: string, cat: string, url: string }[]) => {
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

const parse2Msg = (subject: { id: number, es: string, cat: string, target: string, url: string, rating: number, general?: string }, searchMsg?: string) => {
  let msg = null

  // rating a porcentaje
  const rating = subject.rating * 100
  if (subject.rating > 0)
    msg = ''
      //+ ' Id: ' + subject.id
      + '\nEs: ' + subject.es
      + '\nCat: ' + subject.cat
      + (searchMsg ? '\nBuscado: ' + searchMsg : '')
      + '\nCoincidencia: ' + rating.toFixed(2) + '%'
      + '\nGrupo: ' + subject.url
      + (subject.general ? '\nGeneral: ' + subject.general : '')

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

export { GENERAL_GROUP, fetchDataFromGoogleSheets, findBestSubjectMatch, findMatchingSubjects, normalize, parse2Msg, parseSubject2InlineMsg, parseSubjects2InlineMsg, parseUint8Array2ArraySubjects };
