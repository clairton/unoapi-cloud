// Utilities
import { defineStore } from 'pinia'

export const useDocStore = defineStore('doc', {
  getters: {
    lang: (state) => state.language,
  },
  state: () => ({
    language: 'pt_br',
    languages: [],
    docs: {},
  }),

  actions: {
    async setLang(lang) {
      this.language = lang
    },
    async loadDocs() {
      try {
        const { languages, docs } = getFileTree()
        this.languages = languages
        this.docs = docs
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error)
      }
    },
    async loadDoc(path) {
      try {
        const { language } = this
        const doc = this.docs[path]
        const content = doc[language].content
        return {
          content,
          language,
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error)
        throw new Error('Documento não encontrado')
      }
    },
  },
})

// Function to get the file tree from @doc
function getFileTree() {
  const tree = import.meta.glob('@docs/**/*.{md,mdx}', { as: 'raw', eager: true })
  const docsFiles = {}
  const languages = new Set()

  Object.entries(tree).forEach(([path, imprt]) => {
    const [, , lang, ...rest] = path.split('/')
    languages.add(lang)

    const filename = rest.join('/').replace(/\.mdx?$/, '')
    docsFiles[filename] = docsFiles[filename] || {}

    const vars = extractVars(imprt)

    docsFiles[filename][lang] = {
      path,
      filename,
      content: imprt,
      ...vars,
    }
  })

  return {
    languages: Array.from(languages),
    docs: docsFiles,
  }
}

function extractVars(content) {
  const regex = /\[([a-zA-Z]+)\]: \\\\ "(.*)"/g
  const vars = {}
  let m

  while ((m = regex.exec(content)) !== null) {
    if (m.index === regex.lastIndex) {
      regex.lastIndex++
    }

    vars[m[1]] = m[2]
  }
  return vars
}
