const { HttpsError } = require('firebase-functions/v2/https')
const crypto = require('node:crypto')
const fail = (message, code = 'failed-precondition') => {
  throw new HttpsError(code, message)
}
const id = (value) => typeof value === 'string' && /^[^/]{1,128}$/.test(value)
const date = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
const owner = (kind, data, key) =>
  kind === 'users'
    ? data.role === 'landlord'
      ? key
      : data.landlordId
    : kind === 'signed_contracts'
      ? data.landlordUid
      : data.landlordId
const schemas = {
  users: { name: '姓名', phone: '電話', email: '聯絡信箱' },
  properties: { name: '建物名稱', address: '地址' },
  rooms: {
    name: '房號',
    address: '地址',
    rent: '月租金',
    size: '坪數',
    layout: '格局',
    propertyId: '所屬建物',
    description: '說明',
  },
  tenants: {
    name: '姓名',
    phone: '電話',
    email: '聯絡信箱',
    idNumber: '證件號碼',
    address: '戶籍地址',
    emergencyContact: '緊急聯絡人',
    occupants: '居住人數',
    notes: '備註',
  },
  bills: { amount: '金額', date: '帳單日期', dueDate: '截止日', description: '說明' },
  contracts: { startDate: '起租日', endDate: '到期日', rent: '月租金' },
  signed_contracts: {},
}
function validatePatch(kind, patch) {
  if (
    !schemas[kind] ||
    !patch ||
    typeof patch !== 'object' ||
    Array.isArray(patch) ||
    !Object.keys(patch).length
  )
    fail('請填寫修改內容', 'invalid-argument')
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(schemas[kind], key)) fail('包含不可修改的欄位', 'invalid-argument')
    if (['amount', 'rent', 'size', 'occupants'].includes(key)) {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < (key === 'occupants' ? 1 : 0) ||
        value > 100000000 ||
        (key !== 'size' && !Number.isInteger(value))
      )
        fail(`${schemas[kind][key]}格式錯誤`, 'invalid-argument')
    } else if (typeof value !== 'string' || value.length > 2000)
      fail(`${schemas[kind][key]}格式錯誤`, 'invalid-argument')
    if (['date', 'dueDate', 'startDate', 'endDate'].includes(key) && !date(value))
      fail('日期格式錯誤', 'invalid-argument')
    if (key === 'propertyId' && !id(value)) fail('請選擇建物', 'invalid-argument')
  }
  return patch
}
function needsReason(kind, action) {
  return action !== 'edit' || ['bills', 'contracts'].includes(kind)
}
function assertReason(reason) {
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000)
    fail('請填寫操作原因（最多 1000 字）', 'invalid-argument')
}
function assertLease(value) {
  if (
    !date(value.startDate) ||
    !date(value.endDate) ||
    value.endDate < value.startDate ||
    !Number.isInteger(value.rent) ||
    value.rent < 0
  )
    fail('租期或租金格式錯誤', 'invalid-argument')
}
function scanAnomalies(data) {
  const issues = []
  const add = (kind, row, message) =>
    issues.push({
      key: `${kind}/${row.id}/${message}`,
      kind,
      id: row.id,
      landlordId: owner(kind, row, row.id) || '',
      label: row.name || row.tenantName || row.description || row.id,
      message,
    })
  const landlords = new Set(data.users.filter((x) => x.role === 'landlord').map((x) => x.id))
  const rooms = new Map(data.rooms.map((x) => [x.id, x]))
  const tenants = new Map(data.tenants.map((x) => [x.id, x]))
  const users = new Map(data.users.map((x) => [x.id, x]))
  for (const kind of ['properties', 'rooms', 'tenants', 'bills', 'contracts', 'signed_contracts']) {
    for (const row of data[kind] || [])
      if (!landlords.has(owner(kind, row, row.id))) add(kind, row, '房東關聯不存在')
  }
  for (const t of data.tenants) {
    if (t.uid && !users.has(t.uid)) add('tenants', t, '租客登入資料不存在')
    if (
      t.roomId &&
      !t.isHistorical &&
      (!rooms.has(t.roomId) || rooms.get(t.roomId).landlordId !== t.landlordId)
    )
      add('tenants', t, '房源關聯缺漏或跨房東')
    if (
      t.contractId &&
      !t.isHistorical &&
      !data.contracts.some(
        (c) => c.id === t.contractId && c.landlordId === t.landlordId && c.tenantDocId === t.id
      )
    )
      add('tenants', t, '目前租約關聯不一致')
  }
  for (const c of data.contracts.filter((x) => x.status === 'active')) {
    if (!tenants.has(c.tenantDocId) || tenants.get(c.tenantDocId).landlordId !== c.landlordId)
      add('contracts', c, '租客關聯缺漏或跨房東')
    const matches = data.contracts.filter(
      (o) =>
        o.status === 'active' &&
        o.landlordId === c.landlordId &&
        (c.roomId ? o.roomId === c.roomId : c.roomNumber && o.roomNumber === c.roomNumber)
    )
    if (matches.length > 1) add('contracts', c, '同房源存在多份有效租約')
  }
  return issues
}
module.exports = {
  fail,
  id,
  date,
  today,
  hash,
  owner,
  schemas,
  validatePatch,
  needsReason,
  assertReason,
  assertLease,
  scanAnomalies,
}
