import * as Bolt from '@slack/bolt'
import serverlessExpress from '@vendia/serverless-express'
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const QUEUE_URL = process.env.QUEUE_END_POINT

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET

const expressReceiver = new Bolt.ExpressReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
})

const app = new Bolt.App({
  token: SLACK_BOT_TOKEN,
  receiver: expressReceiver,
})

app.message(/.*/, async (event) => {
  console.log(event)

  try {
    const message = event.message as Bolt.BotMessageEvent
    const command = new SendMessageCommand({
      MessageBody: JSON.stringify(message),
      QueueUrl: QUEUE_URL,
    })
    const client = new SQSClient({})
    const result = await client.send(command)
  } catch (e) {
    console.error(e)
  }
})

export const handler = serverlessExpress({app: expressReceiver.app})
