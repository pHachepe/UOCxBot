import https from "https";
import { findBestMatch } from "string-similarity";

const GENERAL_GROUP = 'Grupo General de Telegram'
// Delete Accents, etc
const normalize = (str: string) => str?.normalize("NFD")?.replace(/[\u0300-\u036f]/g, "").toUpperCase() || ''

// Obtiene los datos de Google Sheets y devuelve una promesa con la data en un array de Uint8Array
async function fetchDataFromGoogleSheets(urlGSheet: string): Promise<Uint8Array[]> {
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

const parseUint8ArrayToSubjectArray = (data: readonly Uint8Array[], app: 'Telegram' | 'WhatsApp' = 'Telegram') => {
  const subjectsTxt = Buffer.concat(data).toString();
  const trimmedText = subjectsTxt.substring(47, subjectsTxt.length - 2);
  const subjectsJson = JSON.parse(trimmedText);

  const rowsJson = subjectsJson.table.rows.slice(2); // Exclude table headers

  const subjects = rowsJson.map((row: any, id: number) => {
    const cells = row.c;
    const [cat, ...rest] = cells.map((cell: any) => cell?.v);

    const subject: any = { id, cat };

    if (app === 'WhatsApp') {
      const [url] = rest;
      subject['url'] = url;
    } else {
      const [es, url] = rest;
      subject['es'] = es;
      subject['url'] = url;
    }

    return subject;
  });

  return subjects.filter((subject: { url: string; }) => subject.url)
};

// ToDo: Refactorizar y quitar el parámetro app y urlGSheet
const getAllSubjects = async (lang: 'es' | 'cat', app: 'Telegram' | 'WhatsApp', urlGSheet: string) => {
  const dataUint8Array = await fetchDataFromGoogleSheets(urlGSheet);
  const subjects = parseUint8ArrayToSubjectArray(dataUint8Array, app);
  const subjectsNames = subjects.map((subject: { lang: string; url: string }) => `<a href="${subject.url}">${subject[lang as keyof typeof subject]}</a>` + '\n');
  return subjectsNames.join('\n')
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
  if (subject.rating > 0) {
    msg = ''
      //+ ' Id: ' + subject.id
      + '\n<b>🇪🇸 Es: </b>' + subject.es
      + '\n<b>⭐️Cat: </b>' + subject.cat
      + (searchMsg ? '\n<b>🔍Buscado: </b>' + searchMsg : '')
      + '\n<b>🫶🏻Coincidencia: </b>' + rating.toFixed(2) + '%'
      + '\n<b>👥Grupo de ' + subject.es + ': </b>' + subject.url
    ;
    if (subject.rating < 0.6)
      msg += '\n\n⚠️⚠️⚠️'
          + '\nSi no es el grupo que buscas, prueba a escribir el nombre completo de la asignatura.'
          + '\n\nTen en cuenta que solo hay asignaturas de Ingeniería Informática.'
          + '\n\nSi quieres añadir grupos de asignaturas de otros grados, contacta con @PeHachePe'
          + (subject.general ? '\n\nTambién puedes probar a preguntar en el\n<b>Grupo General:</b> ' + subject.general : '')
          + '\n⚠️⚠️⚠️\n\n'
  }
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

export { GENERAL_GROUP, fetchDataFromGoogleSheets, findBestSubjectMatch, findMatchingSubjects, getAllSubjects, normalize, parse2Msg, parseSubject2InlineMsg, parseSubjects2InlineMsg, parseUint8ArrayToSubjectArray };
