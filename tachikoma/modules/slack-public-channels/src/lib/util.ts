interface GetParameters {
  [key: string]: any
}

export interface ConversationsListParameters extends GetParameters {
  token: string
  limit?: number
  cursor?: string
}

export function buildUrl(endpoint: string, getParameters?: GetParameters) {
  if (getParameters !== undefined) {
    const parameters =
      Object.entries(getParameters).map(
        ([key, value]) => `${encodeURI(key)}=${encodeURI(value)}`
      )
    return `${endpoint}?${parameters.join('&')}`
  }

  return endpoint
}
