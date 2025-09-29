import { generateUnoId, isUnoId } from '../../src/utils/id'
import { v1 as uuid } from 'uuid'

describe('utils id', () => {
  test('generateUnoId', async () => {
    expect(generateUnoId()).toEqual(expect.stringContaining('UNO.'))
  })

  test('isUnoId with generateUnoId', async () => {
    expect(isUnoId(generateUnoId())).toBe(true)
  })

  test('isUnoId with uuid', async () => {
    expect(isUnoId(uuid())).toBe(true)
  })

  test('generateUnoId with add', async () => {
    expect(generateUnoId('CALL')).toEqual(expect.stringContaining('UNO.CALL.'))
  })
})
