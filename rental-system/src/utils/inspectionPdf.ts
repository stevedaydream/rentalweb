/**
 * 入住點交確認單的 PDF 資料組裝（純字串，無 DOM）。
 *
 * 曾有歧異的項目單獨列一區並置頂：這份文件真正的價值不在「哪幾樣東西正常」，
 * 而在「哪幾項雙方談過、怎麼談的、結論是什麼」——退租吵起來時看的就是這一段。
 */
import {
  CONDITION_LABELS, effectiveCondition, contestedItems,
  type Inspection, type InspectionEntry,
} from './inspection'
import type { Condition } from './inventory'

export const escapeHtml = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const TAG_CLASS: Record<Condition, string> = { normal: 'ok', minor: 'minor', total: 'total' }

const tag = (c?: Condition): string => {
  if (!c) return '<span class="tag">—</span>'
  return `<span class="tag ${TAG_CLASS[c]}">${CONDITION_LABELS[c]}</span>`
}

const money = (n: number): string => `NT$ ${(Number(n) || 0).toLocaleString('en-US')}`

/** 明細表列；屋況項不列單價，避免看起來像可以求償 */
export const buildItemRows = (items: InspectionEntry[]): string =>
  items.map(e => {
    const isAsset = e.kind === 'asset'
    const note = [e.note, e.landlordNote].filter(Boolean).map(escapeHtml).join('／')
    return `<tr>
      <td class="ctr">${isAsset ? '物品' : '屋況'}</td>
      <td>${escapeHtml(e.name)}${note ? `<br><span class="sub">${note}</span>` : ''}</td>
      <td class="num">${isAsset ? e.quantity : '—'}</td>
      <td class="num">${isAsset ? money(e.unitPrice) : '—'}</td>
      <td class="ctr">${tag(e.tenantCondition)}</td>
      <td class="ctr">${tag(effectiveCondition(e))}</td>
    </tr>`
  }).join('\n')

/** 協調軌跡；沒有歧異時回空字串，範本該區塊自然消失 */
export const buildContestedSection = (items: InspectionEntry[]): string => {
  const rows = contestedItems(items)
  if (!rows.length) return ''
  const body = rows.map(e => `<tr>
      <td>${escapeHtml(e.name)}</td>
      <td class="ctr">${tag(e.tenantCondition)}</td>
      <td class="ctr">${tag(e.landlordCondition)}</td>
      <td class="ctr">${tag(e.finalCondition)}</td>
      <td>${escapeHtml(e.landlordNote || '')}</td>
    </tr>`).join('\n')
  return `<div class="sec-label">協調紀錄 Negotiated Items</div>
    <table class="items contested">
      <thead>
        <tr>
          <th>項目 ITEM</th>
          <th class="ctr">租客判定</th>
          <th class="ctr">房東主張</th>
          <th class="ctr">雙方共識</th>
          <th>說明 REMARK</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`
}

/** 瑕疵存證：只列有照片的項目 */
export const buildPhotoSection = (items: InspectionEntry[]): string => {
  const withPhotos = items.filter(e => e.photos.length > 0)
  if (!withPhotos.length) return ''
  const blocks = withPhotos.map(e => {
    const imgs = e.photos
      .filter(p => p.thumbUrl)
      .map(p => `<img src="${escapeHtml(p.thumbUrl)}" alt="">`)
      .join('')
    if (!imgs) return ''
    return `<div class="shot">
      <div class="shot-name">${escapeHtml(e.name)}　${tag(effectiveCondition(e))}</div>
      <div class="shot-imgs">${imgs}</div>
    </div>`
  }).filter(Boolean).join('\n')
  if (!blocks) return ''
  return `<div class="sec-label">瑕疵存證 Photo Evidence</div><div class="shots">${blocks}</div>`
}

export interface PdfExtra {
  today: string
  leaseStart?: string
  leaseEnd?: string
  landlordSignature: string
  tenantSignature: string
}

export const buildPdfData = (
  insp: Pick<Inspection, 'id' | 'items' | 'tenantName' | 'roomName' | 'type'>,
  extra: PdfExtra,
): Record<string, string> => {
  const items = insp.items || []
  const contested = contestedItems(items)
  return {
    inspectionNo: insp.id.slice(-8).toUpperCase(),
    today: extra.today,
    title: insp.type === 'moveout' ? '退租點交確認單' : '入住點交確認單',
    titleEn: insp.type === 'moveout' ? 'Move-out Inspection' : 'Move-in Inspection',
    tenantName: escapeHtml(insp.tenantName || ''),
    room: escapeHtml(insp.roomName || '—'),
    leaseStart: escapeHtml(extra.leaseStart || '—'),
    leaseEnd: escapeHtml(extra.leaseEnd || '—'),
    itemCount: String(items.length),
    contestedCount: String(contested.length),
    itemRows: buildItemRows(items),
    contestedSection: buildContestedSection(items),
    photoSection: buildPhotoSection(items),
    landlordSignature: extra.landlordSignature,
    tenantSignature: extra.tenantSignature,
  }
}

/** 列印檔名；同一天同一間房點交兩次也不會撞名 */
export const pdfFileName = (
  insp: Pick<Inspection, 'id' | 'tenantName' | 'type'>, today: string,
): string => {
  const kind = insp.type === 'moveout' ? '退租點交' : '入住點交'
  return `${kind}確認單_${insp.tenantName || '租客'}_${today}_${insp.id.slice(-4).toUpperCase()}`
}
