import { parseDocument } from 'yaml'

describe('service commander', () => {
  const url = 'http://localhost:3000'
  const header = 'api_access_token'
  const token = 123

  test('parse yml \n', async () => {
    const string = `url: ${url}\nheader: ${header}\ntoken: ${token}`
    // const object = {
    //   header,
    //   url,
    //   token,
    // }
    const doc = parseDocument(string)
    expect(doc.toJS().header).toBe(header)
    expect(doc.toJS().token).toBe(token)
    expect(doc.toJS().url).toBe(url)
  })

  test('parse yml', async () => {
    const string = `
    url: ${url}
    header: ${header}
    token: ${token}`
    const doc = parseDocument(string)
    expect(doc.toJS().header).toBe(header)
    expect(doc.toJS().token).toBe(token)
    expect(doc.toJS().url).toBe(url)
  })
})
