// 本地 PDF 組裝：在瀏覽器重現伺服端 generatePdf 的 injectStyles + applyTemplate，
// 並以隱藏 iframe + window.print() 讓使用者「另存為 PDF」（向量文字、檔案小、零伺服器成本）。
// 與 functions/index.js 的同名函式保持一致；骨架已凍存於 signed_contracts.templateHtml。

// {{key}} → data[key]（與伺服端 applyTemplate 相同）
const applyTemplate = (template: string, data: Record<string, unknown>): string =>
  template.replace(/{{(.*?)}}/g, (_, key: string) => {
    const v = data[key.trim()]
    return v !== undefined && v !== null ? String(v) : ''
  })

// 在 </head> 前注入字型與列印樣式（與伺服端 injectStyles 一致，另加 @page A4 10mm 對齊原 PDF 邊界）
const injectStyles = (html: string): string => {
  const fontLinks = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@400;700&display=swap" rel="stylesheet">
  `
  // @page margin 設 0 才能讓瀏覽器不印頁尾 URL／頁首日期；版面邊界由範本 body 既有 margin 提供。
  const customStyle = `
    <style>
      body { font-family: 'Noto Serif TC', 'Noto Sans TC', "標楷體", DFKai-SB, serif !important; }
      img { max-width: 100%; }
      @page { size: A4; margin: 0; }
    </style>
  `
  return html.replace('</head>', `${fontLinks}\n${customStyle}\n</head>`)
}

// 等待 iframe 內字型與圖片就緒，避免列印時套到 fallback 字型
const waitReady = (iframe: HTMLIFrameElement): Promise<void> =>
  new Promise((resolve) => {
    const win = iframe.contentWindow
    const doc = iframe.contentDocument
    if (!win || !doc) { resolve(); return }
    let settled = false
    const finish = () => { if (!settled) { settled = true; resolve() } }
    const afterLoad = () => {
      const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts
      if (fonts?.ready) fonts.ready.then(finish).catch(finish)
      else finish()
    }
    if (doc.readyState === 'complete') afterLoad()
    else win.addEventListener('load', afterLoad, { once: true })
    // 安全網：最長等 4 秒仍未就緒就強制列印
    setTimeout(finish, 4000)
  })

/**
 * 以隱藏 iframe + 列印對話框產生合約 PDF。
 * 成功 resolve；任何失敗都會 throw，呼叫端可退回伺服端 generatePdf。
 */
export const printHtmlPdf = async (
  templateHtml: string,
  data: Record<string, unknown>,
  filename?: string,
): Promise<void> => {
  if (!templateHtml || !templateHtml.trim()) throw new Error('缺少範本骨架，無法本地組裝')
  const filledHtml = applyTemplate(injectStyles(templateHtml), data)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0',
  })
  document.body.appendChild(iframe)

  // 部分瀏覽器以「父頁面」title 作為列印工作（另存 PDF）的預設檔名，故一併暫改、列印後還原
  const prevParentTitle = document.title

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('無法存取列印 iframe 文件')
    doc.open()
    doc.write(filledHtml)
    doc.close()

    await waitReady(iframe)

    const win = iframe.contentWindow
    if (!win) throw new Error('列印 iframe 視窗遺失')

    // 還原 title + 移除 iframe 必須等「列印對話框關閉」才做。
    // 用 afterprint 事件（而非固定延遲）：否則使用者還沒按「儲存」title 就被還原，預設檔名會跑掉。
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      document.title = prevParentTitle
      iframe.remove()
    }
    win.addEventListener('afterprint', cleanup, { once: true })
    window.addEventListener('afterprint', cleanup, { once: true })
    setTimeout(cleanup, 60000) // 安全網：afterprint 萬一未觸發

    // 在 print() 前一刻才設 title（消除 await 期間被重置的空窗）。
    // 瀏覽器以 iframe 列印時，預設檔名多取「父頁面」title，故兩者都設。
    if (filename) {
      doc.title = filename
      document.title = filename
    }

    win.focus()
    win.print()
  } catch (e) {
    document.title = prevParentTitle
    iframe.remove()
    throw e
  }
}
