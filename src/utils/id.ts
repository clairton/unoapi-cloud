import { v1 as uuid } from 'uuid'
const UNOAPI_BASE_ID = 'UNO'

export type ID_ADD = 'INC' // incoming messages
                    | 'NOT' // notification message
                    | 'QR' // qrcodes
                    | 'STT' // speach to text
                    | 'OUT' // outgoing message
                    | 'CMD' // commander message
                    | 'CALL' // call message
                    | 'WARN' // warning message

export const generateUnoId = (add: ID_ADD | '' = '') => `${UNOAPI_BASE_ID}.${add ? `${add}.` : ''}${uuid().replaceAll('-', '').toUpperCase()}`
export const isUnoId = (id: string) => id && (id.indexOf('-') >= 0 || id.indexOf(`${UNOAPI_BASE_ID}.`) >= 0)