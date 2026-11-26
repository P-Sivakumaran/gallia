import zlib from 'zlib'

/**
 * Lightweight, zero-dependency PDF text extractor for listed-club press release documents.
 * Decodes FlateDecode compressed streams and applies ToUnicode CMap font mappings.
 */
export function extractTextFromPdfBuffer(pdfBuffer: Buffer): string {
  const s = pdfBuffer.toString('latin1')
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g

  let match: RegExpExecArray | null
  const cmaps: Map<number, string>[] = []
  const textStreams: string[] = []

  while ((match = streamRegex.exec(s)) !== null) {
    try {
      const rawStream = Buffer.from(match[1], 'latin1')
      const decompressed = zlib.inflateSync(rawStream)
      const content = decompressed.toString('latin1')

      if (content.includes('begincmap')) {
        cmaps.push(parseCMap(content))
      } else if (content.includes('BT') && content.includes('ET')) {
        textStreams.push(content)
      }
    } catch {
      // Ignore uncompressed or unsupported filter streams
    }
  }

  // Merge CMaps
  const fullCMap = new Map<number, string>()
  for (const cmap of cmaps) {
    for (const [k, v] of cmap.entries()) {
      fullCMap.set(k, v)
    }
  }

  let fullText = ''

  for (const streamContent of textStreams) {
    const btBlocks = streamContent.match(/BT[\s\S]*?ET/g) || []
    for (const block of btBlocks) {
      // TJ operator: array of strings and positioning numbers [(text) -10 (more)] TJ
      const tjMatches = block.match(/\[([\s\S]*?)\]\s*TJ/g)
      if (tjMatches) {
        for (const tj of tjMatches) {
          const raw = tj.replace(/\[|\]\s*TJ/g, '')
          const tokenRe = /\((.*?)\)|<([0-9a-fA-F]+)>/g
          let tok: RegExpExecArray | null
          let line = ''
          while ((tok = tokenRe.exec(raw)) !== null) {
            if (tok[1] !== undefined) {
              line += tok[1]
            } else if (tok[2] !== undefined) {
              const hex = tok[2]
              // 4-char CID codes in ToUnicode
              for (let i = 0; i < hex.length; i += 4) {
                const code = parseInt(hex.slice(i, i + 4), 16)
                line += fullCMap.get(code) || ''
              }
            }
          }
          if (line.trim()) fullText += line + ' '
        }
      }

      // Tj operator: single string (text) Tj
      const singleTjMatches = block.match(/\((.*?)\)\s*Tj/g)
      if (singleTjMatches) {
        for (const stj of singleTjMatches) {
          const inner = stj.replace(/^\(|\)\s*Tj$/g, '')
          if (inner.trim()) fullText += inner + ' '
        }
      }
      fullText += '\n'
    }
  }

  return normalizeExtractedText(fullText)
}

function parseCMap(cmapStr: string): Map<number, string> {
  const map = new Map<number, string>()

  // beginbfchar block
  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g
  let m: RegExpExecArray | null
  while ((m = bfcharRe.exec(cmapStr)) !== null) {
    const lines = m[1].trim().split(/\r?\n/)
    for (const line of lines) {
      const match = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/)
      if (match) {
        const src = parseInt(match[1], 16)
        const dst = String.fromCharCode(parseInt(match[2], 16))
        map.set(src, dst)
      }
    }
  }

  // beginbfrange block
  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g
  while ((m = bfrangeRe.exec(cmapStr)) !== null) {
    const lines = m[1].trim().split(/\r?\n/)
    for (const line of lines) {
      const match = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/)
      if (match) {
        const start = parseInt(match[1], 16)
        const end = parseInt(match[2], 16)
        let dstCode = parseInt(match[3], 16)
        for (let c = start; c <= end; c++) {
          map.set(c, String.fromCharCode(dstCode++))
        }
      }
    }
  }

  return map
}

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    // Fix spaced out numbers e.g. "4. 8" -> "4.8"
    .replace(/(\d+)\.\s+(\d+)/g, '$1.$2')
    // Fix common punctuation spacing
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/€\s+/g, '€ ')
    // Normalize dashes
    .replace(/[–—]/g, '-')
    // Clean excessive spaces and newlines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
}
