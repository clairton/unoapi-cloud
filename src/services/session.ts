export interface writeData {
  (key: string, data: object): Promise<void>
}

export interface readData {
  (key: string): Promise<object | undefined>
}

export interface removeData {
  (key: string): Promise<void>
}

export interface getKey {
  (type: string, id): string
}

export interface session {
  (phone: string): Promise<{ writeData: writeData; readData: readData; removeData: removeData; getKey: getKey }>
}
