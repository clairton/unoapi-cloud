import request from 'supertest'

import app from '../../src/app'

describe('index routes', () => {
  test('ping', async () => {
    const res = await request(app.server).get('/ping')
    expect(res.text).toEqual('pong!')
  })
})
