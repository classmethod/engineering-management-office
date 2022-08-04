import { waitingTimeForTier2 } from './lib/time'
import { buildUrl, ConversationsListParameters } from './lib/util'

const LIMIT = 1000
const NUMOF_COLUMNS = 15
const ROW_OFFSET = 2
const COLUMN_OFFSET = 1
const HEADER = [
  'name',
  'topic',
  'purpose',
  'numof members',
  'created at',
  'general?',
  'archived?',
]

function main() {
  initializeSheet()
  updateChannels()
}

function getVariable(key: string) {
  if (PropertiesService !== undefined) {
    const scriptProperties = PropertiesService.getScriptProperties()
    return scriptProperties.getProperty(key)
  }

  return process.env[key]
}

async function updateChannels() {
  const endpoint = 'https://slack.com/api/conversations.list'
  const limit = LIMIT
  const parameters: ConversationsListParameters = {
    token: getVariable('SLACK_BOT_TOKEN'),
    limit,
  }

  let hasNext = true
  let pageNumber = 0
  while (hasNext) {
    const {channels, nextCursor} = getChannels(endpoint, parameters)

    writeChannels(channels, pageNumber)
    if (nextCursor !== '') {
      parameters.cursor = nextCursor
    }

    hasNext = nextCursor !== ''
    ++pageNumber

    Utilities.sleep(waitingTimeForTier2())
  }
}

function getChannels(endpoint: string, parameters: ConversationsListParameters) {
  const url = buildUrl(endpoint, parameters)
  const httpResponse = UrlFetchApp.fetch(url)

  try {
    const response = JSON.parse(httpResponse.getContentText())
    const channels = response.channels.map(channel => [
      channel.name,
      channel.topic.value,
      channel.purpose.value,
      channel.num_members,
      new Date(channel.created * 1000).toISOString(),
      channel.is_general ? '✓' : '',
      channel.is_archived ? '✓' : '',
    ])

    return {
      channels,
      nextCursor: response.response_metadata.next_cursor,
    }
  }
  catch (e) {
    console.error(e)
  }
}

function initializeSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = spreadsheet.getSheets()[0]
  sheet.getRange("A:Z").setValue('')
  sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER])
}

function writeChannels(channels, pageNumber) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = spreadsheet.getSheets()[0]

  const row = pageNumber * LIMIT + ROW_OFFSET
  const column = COLUMN_OFFSET
  const height = channels.length
  const width = channels[0].length

  console.log(row, column, height, width)

  sheet.getRange(row, column, height, width).setValues(channels)
}
