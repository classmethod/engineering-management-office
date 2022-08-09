import * as kuromoji from 'kuromoji'

import negativeWords from '../assets/negative-words.json'

type NegativeWords = Array<string>

export default function detectNegativeWords(target: string): Promise<NegativeWords> {
  return new Promise((resolve) => {
    kuromoji.builder({
      dicPath: 'assets/dict'
    }).build((err, tokenizer) => {
      const tokens = tokenizer.tokenize(target)
      const basicForms = tokens.map(token => token.basic_form)
      console.log(basicForms)

      const result = basicForms.reduce<NegativeWords>((result, basicForm) => {
        if (negativeWords.includes(basicForm)) {
          result.push(basicForm)
        }
        return result
      }, [])
      console.log(result)

      return resolve(result)
    })
  })
}
