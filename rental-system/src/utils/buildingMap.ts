/**
 * 大樓資訊地圖的共用定義。
 *
 * 房東端畫、租客端看，兩邊必須用同一份底圖與同一組標記設定——原本各寫一份，
 * 模板 SVG 的房間配置、欄位名稱都對不上，房東存好的圖租客根本看不到。
 */

export type MarkerType = 'exit' | 'extinguisher' | 'firstaid' | 'facility' | 'warning' | 'appliance'

export interface Marker {
  id: string
  x: number
  y: number
  type: MarkerType
  label: string
  description: string
  customIcon?: string
}

export interface Facility {
  id: string
  icon: string
  name: string
  location: string
  rules: string
}

export interface Shape {
  id: string
  type: 'rect' | 'line' | 'text'
  x1: number; y1: number
  x2: number; y2: number
  text?: string
  fill: string
  stroke: string
}

export type TemplateId = 'blank' | 'studio' | 'onebedroom' | 'twobedroom'

export interface BuildingInfoData {
  mapType: 'none' | 'template' | 'custom'
  templateId: TemplateId
  mapImageUrl: string | null
  markers: Marker[]
  facilities: Facility[]
  shapes: Shape[]
}

export const MARKER_CONFIG: Record<MarkerType, { icon: string; bg: string; triangle: string; label: string }> = {
  exit:         { icon: 'door_open',              bg: 'bg-green-500',   triangle: 'border-t-green-500',   label: '逃生出口' },
  extinguisher: { icon: 'fire_extinguisher',      bg: 'bg-red-500',     triangle: 'border-t-red-500',     label: '滅火器'   },
  firstaid:     { icon: 'medical_services',       bg: 'bg-blue-500',    triangle: 'border-t-blue-500',    label: '急救箱'   },
  facility:     { icon: 'meeting_room',           bg: 'bg-amber-500',   triangle: 'border-t-amber-500',   label: '公共設施' },
  warning:      { icon: 'warning',                bg: 'bg-orange-500',  triangle: 'border-t-orange-500',  label: '注意事項' },
  appliance:    { icon: 'local_laundry_service',  bg: 'bg-purple-500',  triangle: 'border-t-purple-500',  label: '家電設備' },
}

export const APPLIANCE_ICONS: { icon: string; label: string }[] = [
  { icon: 'local_laundry_service', label: '洗衣機' },
  { icon: 'dry_cleaning',          label: '烘乾機' },
  { icon: 'kitchen',               label: '冰箱'   },
  { icon: 'microwave',             label: '微波爐' },
  { icon: 'water_heater',          label: '熱水器' },
  { icon: 'ac_unit',               label: '冷氣'   },
  { icon: 'wifi',                  label: 'Wi-Fi'  },
  { icon: 'elevator',              label: '電梯'   },
  { icon: 'fitness_center',        label: '健身房' },
  { icon: 'pool',                  label: '游泳池' },
  { icon: 'local_parking',         label: '停車場' },
  { icon: 'pedal_bike',            label: '停車格' },
  { icon: 'package_2',             label: '倉庫'   },
  { icon: 'security_camera',       label: '監視器' },
  { icon: 'electrical_services',   label: '電箱'   },
  { icon: 'plumbing',              label: '水管'   },
  { icon: 'solar_power',           label: '太陽能' },
  { icon: 'trash',                 label: '垃圾間' },
]

export const SVG_TEMPLATES: Record<string, string> = {
  blank: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="w-full h-auto block"><rect width="480" height="300" fill="#f9f9f7"/><rect x="8" y="8" width="464" height="284" fill="#fafaf8" stroke="#ccc" stroke-width="2" stroke-dasharray="8,4" rx="4"/><text x="240" y="158" text-anchor="middle" fill="#bbb" font-size="13" font-family="sans-serif">空白模板，點擊新增標記</text></svg>`,
  studio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="w-full h-auto block"><rect width="480" height="300" fill="#f9f9f7"/><rect x="8" y="8" width="464" height="284" fill="none" stroke="#777" stroke-width="3"/><line x1="320" y1="8" x2="320" y2="190" stroke="#777" stroke-width="2"/><line x1="8" y1="218" x2="472" y2="218" stroke="#777" stroke-width="2"/><rect x="60" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="200" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="474" y="50" width="6" height="50" fill="#a0c8f0" rx="1"/><path d="M318 140 A28 28 0 0 0 290 112" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="318" y1="140" x2="318" y2="112" stroke="#aaa" stroke-width="1.5"/><path d="M160 218 A28 28 0 0 0 188 190" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="160" y1="218" x2="160" y2="190" stroke="#aaa" stroke-width="1.5"/><text x="164" y="118" text-anchor="middle" fill="#555" font-size="15" font-family="sans-serif" font-weight="500">居室 / 臥室</text><text x="396" y="105" text-anchor="middle" fill="#555" font-size="13" font-family="sans-serif">衛浴間</text><text x="240" y="262" text-anchor="middle" fill="#555" font-size="13" font-family="sans-serif">廚房 / 玄關</text></svg>`,
  onebedroom: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="w-full h-auto block"><rect width="480" height="300" fill="#f9f9f7"/><rect x="8" y="8" width="464" height="284" fill="none" stroke="#777" stroke-width="3"/><line x1="255" y1="8" x2="255" y2="210" stroke="#777" stroke-width="2"/><line x1="8" y1="210" x2="472" y2="210" stroke="#777" stroke-width="2"/><line x1="155" y1="210" x2="155" y2="292" stroke="#777" stroke-width="2"/><rect x="50" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="290" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="474" y="60" width="6" height="50" fill="#a0c8f0" rx="1"/><path d="M253 100 A28 28 0 0 0 225 72" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="253" y1="100" x2="253" y2="72" stroke="#aaa" stroke-width="1.5"/><path d="M95 210 A28 28 0 0 0 123 182" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="95" y1="210" x2="95" y2="182" stroke="#aaa" stroke-width="1.5"/><text x="131" y="118" text-anchor="middle" fill="#555" font-size="15" font-family="sans-serif" font-weight="500">客廳</text><text x="363" y="118" text-anchor="middle" fill="#555" font-size="15" font-family="sans-serif" font-weight="500">臥室</text><text x="81" y="258" text-anchor="middle" fill="#555" font-size="12" font-family="sans-serif">衛浴</text><text x="313" y="258" text-anchor="middle" fill="#555" font-size="12" font-family="sans-serif">廚房 / 玄關</text></svg>`,
  twobedroom: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="w-full h-auto block"><rect width="480" height="300" fill="#f9f9f7"/><rect x="8" y="8" width="464" height="284" fill="none" stroke="#777" stroke-width="3"/><line x1="8" y1="195" x2="472" y2="195" stroke="#777" stroke-width="2"/><line x1="255" y1="8" x2="255" y2="195" stroke="#777" stroke-width="2"/><line x1="175" y1="195" x2="175" y2="292" stroke="#777" stroke-width="2"/><rect x="50" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="290" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="474" y="60" width="6" height="50" fill="#a0c8f0" rx="1"/><path d="M200 193 A28 28 0 0 0 228 165" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="200" y1="193" x2="200" y2="165" stroke="#aaa" stroke-width="1.5"/><path d="M340 193 A28 28 0 0 0 368 165" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="340" y1="193" x2="340" y2="165" stroke="#aaa" stroke-width="1.5"/><text x="131" y="108" text-anchor="middle" fill="#555" font-size="14" font-family="sans-serif" font-weight="500">臥室 1</text><text x="363" y="108" text-anchor="middle" fill="#555" font-size="14" font-family="sans-serif" font-weight="500">臥室 2</text><text x="323" y="252" text-anchor="middle" fill="#555" font-size="13" font-family="sans-serif">客廳 / 餐廳</text><text x="91" y="250" text-anchor="middle" fill="#555" font-size="11" font-family="sans-serif">衛浴</text><text x="420" y="250" text-anchor="middle" fill="#555" font-size="11" font-family="sans-serif">廚房</text></svg>`,
}

export const TEMPLATE_OPTIONS: { id: TemplateId; name: string; desc: string; thumbnail: string }[] = [
  { id: 'blank',      name: '空白模板', desc: '自由配置', thumbnail: SVG_TEMPLATES['blank']!.replace('class="w-full h-auto block"', 'style="width:100%;height:auto"') },
  { id: 'studio',     name: '套房型',   desc: '一室一廳', thumbnail: SVG_TEMPLATES['studio']!.replace('class="w-full h-auto block"', 'style="width:100%;height:auto"') },
  { id: 'onebedroom', name: '一房一廳', desc: '兩室一廳', thumbnail: SVG_TEMPLATES['onebedroom']!.replace('class="w-full h-auto block"', 'style="width:100%;height:auto"') },
  { id: 'twobedroom', name: '兩房一廳', desc: '三室一廳', thumbnail: SVG_TEMPLATES['twobedroom']!.replace('class="w-full h-auto block"', 'style="width:100%;height:auto"') },
]

export const emptyBuildingInfo = (): BuildingInfoData => ({
  mapType: 'none', templateId: 'blank', mapImageUrl: null, markers: [], facilities: [], shapes: [],
})

/**
 * 讀進來的 buildingInfo 一律過這裡。
 * 早期租客端把自訂底圖存成 `customImageUrl`、設施說明存成 `description`，
 * 兩邊欄位名對不上就等於「存了但看不到」，故在此吸收掉舊名稱。
 */
export const normalizeBuildingInfo = (raw: any): BuildingInfoData => {
  const data = raw || {}
  const mapImageUrl = data.mapImageUrl ?? data.customImageUrl ?? null
  const mapType: BuildingInfoData['mapType'] =
    data.mapType === 'custom' || data.mapType === 'template' ? data.mapType
      : mapImageUrl ? 'custom'
        : data.templateId ? 'template'
          : 'none'
  return {
    mapType,
    templateId: (data.templateId ?? 'blank') as TemplateId,
    mapImageUrl,
    markers: Array.isArray(data.markers) ? data.markers : [],
    facilities: (Array.isArray(data.facilities) ? data.facilities : []).map((f: any) => ({
      id: f.id,
      icon: f.icon ?? '⚙️',
      name: f.name ?? '',
      location: f.location ?? '',
      rules: f.rules ?? f.description ?? '',
    })),
    shapes: Array.isArray(data.shapes) ? data.shapes : [],
  }
}
