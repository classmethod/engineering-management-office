import { SQSHandler } from 'aws-lambda'
import { WebClient } from '@slack/web-api'

import detectNegativeWords from './detect-negative-words'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

export const handler: SQSHandler = async (event, _context) => {
  console.log(event)
  try {
    for (let record of event.Records) {
      const body = JSON.parse(record.body)

      const negativeWords = await detectNegativeWords(body.text)

      if (negativeWords.length === 0) {
        return
      }

      const text = `<@${body.user}>くん、その言葉使いは良くないよ〜: ${negativeWords.join(', ')}`
      const client = new WebClient(SLACK_BOT_TOKEN)
      const response = await client.chat.postMessage({
        channel: body.channel,
        text,
      })

      console.log(response)
    }
  } catch (error) {
    console.error(error)
  }
}
