<script setup>
import { ref } from 'vue'
import Signature from './Signature.vue'
const props = defineProps({ form: Object })
const showSignModal = ref(false)
const showLandlordPwdModal = ref(false)
const landlordPwdInput = ref('')
const landlordPwdError = ref('')
const LANDLORD_PASSWORD = '8888' // 這裡直接寫死，可改用環境變數或API
const showLandlordSignModal = ref(false)



function setSignature(img) {
  props.form.signature = img
  showSignModal.value = false
}

//房東簽名密碼元件
function setLandlordSignature(img) {
  props.form.landlordSignature = img
  showLandlordSignModal.value = false
}
function handleLandlordPwdOk() {
  if (landlordPwdInput.value === LANDLORD_PASSWORD) {
    showLandlordPwdModal.value = false
    landlordPwdInput.value = ''
    landlordPwdError.value = ''
    showLandlordSignModal.value = true
  } else {
    landlordPwdError.value = '密碼錯誤，請再試一次'
  }
}



</script>

<style scoped>
.preview-container {
  text-align: left;         /* 讓所有文字靠左 */
  font-family: 'Noto Sans TC', '微軟正黑體', sans-serif;
  color: #222;
  background: #fff;
  border-radius: 14px;
  padding: 28px 24px 24px 24px;
  box-shadow: 0 2px 12px #88a8e633;
}
.section-title {
  color: #2767c7;
  font-weight: bold;
  margin-top: 22px;
}
.signature-table {
  width: 100%;
  margin-top: 30px;
  margin-bottom: 12px;
  border-collapse: separate;
  border-spacing: 0 14px;
}

.signature-table th {
  text-align: center;
  font-size: 1.09em;
  color: #2767c7;
  font-weight: 600;
  padding-bottom: 6px;
  letter-spacing: 1.5px;
  border: none;
  background: none;
}

.signature-table td {
  text-align: center;
  border: none;
  background: none;
}

.signature-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 90px;
  padding: 8px 0 0 0;
}

.signature-img {
  height: 60px;
  max-width: 120px;
  border: 1px solid #aaa;
  margin-bottom: 6px;
  background: #fafafa;
  object-fit: contain;
}

.sign-line {
  width: 100px;
  height: 2px;
  background: #ccc;
  margin-top: 6px;
  border-radius: 2px;
}

.modal-mask {
  position: fixed; left:0;top:0;right:0;bottom:0;
  background: rgba(0,0,0,.25); display:flex; align-items:center; justify-content:center; z-index:999;
}
.modal-content {
  background: #fff; border-radius:10px; box-shadow:0 4px 24px #0001;
  padding:28px 28px 22px 28px; min-width:260px; text-align:center;
}


</style>

<template>
  <div class="preview-container">
     <h1>住宅租賃契約書</h1>
  <p>房號：{{form.roomNo}}</p>
  <p>租賃地址：{{form.address}}</p>
  <p>租賃期間：自 {{form.startDate}} 起至 {{form.endDate}} 止</p>
  <p>承租人：{{form.tenant}}　　出租人：{{form.landlord}}</p>
  <p>本契約依內政部109年8月26日台內地字第1090264511號函修正</p>

  <div class="section-title">第一條　租賃標的</div>
  <ol>
    <li>租賃住宅標示：門牌：{{form.address}}</li>
    <li>租賃範圍：房號：{{form.roomNo}}，附屬設備依附件。</li>
    <li>車位：依契約內容約定。</li>
  </ol>

  <div class="section-title">第二條　租賃期間</div>
  <p>自 {{form.startDate}} 起至 {{form.endDate}} 止。（租賃期間至少三十日以上）</p>

  <div class="section-title">第三條　租金約定及支付</div>
  <p>
    承租人每月租金為新臺幣 {{form.rentfee}} 元整，每期應繳納 1 個月租金，並於每月 5 日前支付，不得藉任何理由拖延或拒絕。<br>
    出租人於租賃期間亦不得藉任何理由要求調漲租金。<br>
    租金支付方式：現金或轉帳，帳戶資訊詳契約正本。
  </p>

  <div class="section-title">第四條　押金約定及返還</div>
  <p>
    押金由租賃雙方約定為 2 個月租金，金額為 {{form.deposit}} 元整（最高不得超過二個月租金之總額）。承租人應於簽訂本契約之同時給付出租人。<br>
    前項押金，除有第十一條第四項、第十三條第三項、第十四條第四項及第十八條第二項得抵充之情形外，出租人應於租期屆滿或租賃契約終止，承租人返還租賃住宅時，返還押金或抵充本契約所生債務後之賸餘押金。
  </p>

  <div class="section-title">第五條　租賃期間相關費用之約定</div>
  <ul>
    <li>管理費：無</li>
    <li>水費：由出租人負擔。</li>
    <li>電費：由承租人負擔。（備註：公共區域電費由房東負擔）</li>
    <li>瓦斯費：無</li>
    <li>網路費：由出租人負擔。</li>
  </ul>

  <div class="section-title">第六條　稅費負擔之約定</div>
  <p>
    本契約有關稅費，依下列約定辦理：<br>
    租賃住宅之房屋稅、地價稅由出租人負擔。<br>
    本契約租賃雙方不同意辦理公證。
  </p>

  <div class="section-title">第七條　使用租賃住宅之限制</div>
  <ol>
    <li>本租賃住宅係供居住使用，承租人不得變更用途。</li>
    <li>承租人同意遵守公寓大廈規約或其他住戶應遵行事項，不得違法使用、存放有爆炸性或易燃性物品。</li>
    <li>承租人應經出租人同意始得將本租賃住宅之全部或一部分轉租、出借或以其他方式供他人使用，或將租賃權轉讓於他人。前項出租人同意轉租者，應出具同意書載明同意轉租之範圍、期間及得終止本契約之事由，供承租人轉租時向次承租人提示。</li>
    <li>未經同意不可養寵物，若違反條款屢勸不聽者，將依法多扣除至多1個月押金並限期搬離。</li>
  </ol>

  <div class="section-title">第八條　修繕</div>
  <ol>
    <li>租賃住宅或附屬設備損壞時，應由出租人負責修繕。但租賃雙方另有約定、習慣或其損壞係可歸責於承租人之事由者，不在此限。</li>
    <li>前項由出租人負責修繕者，承租人得定相當期限催告修繕，如出租人未於承租人所定相當期限內修繕時，承租人得自行修繕，並請求出租人償還其費用或於第三條約定之租金中扣除。</li>
    <li>出租人為修繕租賃住宅所為之必要行為，應於相當期間先期通知，承租人無正當理由不得拒絕。</li>
    <li>前項出租人於修繕期間，致租賃住宅全部或一部不能居住使用者，承租人得請求出租人扣除該期間全部或一部之租金。</li>
  </ol>

  <div class="section-title">第九條　室內裝修</div>
  <ol>
    <li>承租人有室內裝修之需要，應經出租人同意並依相關法令規定辦理，且不得損害原有建築結構之安全。</li>
    <li>承租人經出租人同意裝修者，其裝修增設部分若有損壞，由承租人負責修繕。第一項情形，承租人返還租賃住宅時，應負責回復原狀。</li>
  </ol>

  <div class="section-title">第十條　出租人之義務及責任</div>
  <ol>
    <li>出租人應出示有權出租本租賃住宅之證明文件及國民身分證或其他足資證明身分之文件，供承租人核對。</li>
    <li>出租人應以合於所約定居住使用之租賃住宅，交付承租人，並應於租賃期間保持其合於居住使用之狀態。</li>
    <li>出租人與承租人簽訂本契約前，租賃住宅有由承租人負責修繕之項目及範圍者，出租人應先向承租人說明並經承租人確認，未經約明確認者，出租人應負責修繕，並提供有修繕必要時之聯絡方式。</li>
  </ol>

  <div class="section-title">第十一條　承租人之義務及責任</div>
  <ol>
    <li>承租人應於簽訂本契約時，出示國民身分證或其他足資證明身分之文件，供出租人核對。</li>
    <li>承租人應以善良管理人之注意，保管、使用租賃住宅。</li>
    <li>承租人違反前項義務，致租賃住宅毀損或滅失者，應負損害賠償責任。但依約定之方法或依租賃住宅之性質使用、收益，致有變更或毀損者，不在此限。</li>
    <li>前項承租人應賠償之金額，得由第四條第一項規定之押金中抵充，如有不足，並得向承租人請求給付不足之金額。</li>
    <li>承租人經出租人同意轉租者，與次承租人簽訂轉租契約時，應不得逾出租人同意轉租之範圍及期間，並應於簽訂轉租契約後三十日內，以書面將轉租範圍、期間、次承租人之姓名及通訊住址等相關資料通知出租人。</li>
  </ol>

  <div class="section-title">第十二條　租賃住宅部分滅失</div>
  <p>
    租賃關係存續中，因不可歸責於承租人之事由，致租賃住宅之一部滅失者，承租人得按滅失之部分，請求減少租金。
  </p>

  <div class="section-title">第十三條　任意終止租約之約定</div>
  <p>
    本契約於期限屆滿前，除依第十六條及第十七條規定得提前終止租約外，租賃雙方不得任意終止租約。<br>
    依前項約定得終止租約者，租賃之一方應至少於終止前一個月通知他方。一方未為先期通知而逕行終止租約者，應賠償他方最高不得超過一個月租金額之違約金。<br>
    前項承租人應賠償之違約金，得由第四條第一項規定之押金中抵充，如有不足，並得向承租人請求給付不足之金額。<br>
    租期屆滿前，依第一項終止租約者，出租人已預收之租金應返還予承租人。
  </p>

  <div class="section-title">第十四條　租賃住宅之返還</div>
  <ol>
    <li>租賃關係消滅時，出租人應即結算租金及第五條約定之相關費用，並會同承租人共同完成屋況及附屬設備之點交手續，承租人應將租賃住宅返還出租人並遷出戶籍或其他登記。</li>
    <li>前項租賃之一方未會同點交，經他方定相當期限催告仍不會同者，視為完成點交。</li>
    <li>承租人未依第一項規定返還租賃住宅時，出租人應即明示不以不定期限繼續契約，並得向承租人請求未返還租賃住宅期間之相當月租金額，及相當月租金額計算之違約金(未足一個月者，以日租金折算)至返還為止。</li>
    <li>前項金額與承租人未繳清之租金及第五條約定之相關費用，出租人得由第四條第一項規定之押金中抵充，如有不足，並得向承租人請求給付不足之金額或費用。</li>
  </ol>

  <div class="section-title">第十五條　租賃住宅所有權之讓與</div>
  <ol>
    <li>出租人於租賃住宅交付後，承租人占有中，縱將其所有權讓與第三人，本契約對於受讓人仍繼續存在。</li>
    <li>前項情形，出租人應移交押金及已預收之租金與受讓人，並以書面通知承租人。</li>
    <li>本契約如未經公證，其期限逾五年者，不適用前二項之規定。</li>
  </ol>

  <div class="section-title">第十六條　出租人提前終止租約</div>
  <p>
    租賃期間有下列情形之一者，出租人得提前終止租約，且承租人不得要求任何賠償：
  </p>
  <ol>
    <li>出租人為重新建築而必要收回。</li>
    <li>承租人遲付租金之總額達二個月之租金額，經出租人定相當期限催告，仍不為支付。</li>
    <li>承租人積欠管理費或其他應負擔之費用達二個月之租金額，經出租人定相當期限催告，仍不為支付。</li>
    <li>承租人違反第七條第一項規定，擅自變更用途，經出租人阻止仍繼續為之。</li>
    <li>承租人違反第七條第二項規定，違法使用、存放有爆炸性或易燃性物品，經出租人阻止仍繼續為之。</li>
    <li>承租人違反第七條第三項規定，擅自將租賃住宅轉租或轉讓租賃權予他人。</li>
    <li>承租人毀損租賃住宅或附屬設備，經出租人定相當期限催告修繕仍不為修繕或相當之賠償。</li>
    <li>承租人違反第九條第一項規定，未經出租人同意，擅自進行室內裝修，經出租人阻止仍繼續為之。</li>
    <li>承租人違反第九條第一項規定，未依相關法令規定進行室內裝修，經出租人阻止仍繼續為之。</li>
    <li>承租人違反第九條第一項規定，進行室內裝修，損害原有建築結構之安全。</li>
  </ol>
  <p>
    出租人依前項規定提前終止租約者，應依下列規定期限，檢附相關事證，以書面通知承租人。但依前項第五款及第十款規定終止者，得不先期通知：<br>
    (一)依前項第一款規定終止者，於終止前三個月。<br>
    (二)依前項第二款至第四款、第六款至第九款規定終止者，於終止前三十日。
  </p>

  <div class="section-title">第十七條　承租人提前終止租約</div>
  <p>
    租賃期間有下列情形之一，致難以繼續居住者，承租人得提前終止租約，出租人不得要求任何賠償：
  </p>
  <ol>
    <li>租賃住宅未合於所約定居住使用，並有修繕之必要，經承租人定相當期限催告，仍不於期限內修繕。</li>
    <li>租賃住宅因不可歸責承租人之事由致一部滅失，且其存餘部分不能達租賃之目的。</li>
    <li>租賃住宅有危及承租人或其同居人之安全或健康之瑕疵；承租人於簽約時已明知該瑕疵或拋棄終止租約權利者，亦同。</li>
    <li>承租人因疾病、意外產生有長期療養之需要。</li>
    <li>因第三人就租賃住宅主張其權利，致承租人不能為約定之居住使用。</li>
  </ol>
  <p>
    承租人依前項各款規定提前終止租約者，應於終止前三十日，檢附相關事證，以書面通知出租人。但前項第三款前段其情況危急者，得不先期通知。<br>
    承租人死亡，其繼承人得主張終止租約，其通知期限及方式，準用前項規定。
  </p>

  <div class="section-title">第十八條　遺留物之處理</div>
  <p>
    租賃關係消滅，依第十四條完成點交或視為完成點交之手續後，承租人仍於租賃住宅有遺留物者，除租賃雙方另有約定外，經出租人定相當期限向承租人催告，屆期仍不取回時，視為拋棄其所有權。<br>
    出租人處理前項遺留物所生費用，得由第四條第一項規定之押金中抵充，如有不足，並得向承租人請求給付不足之費用。
  </p>

  <div class="section-title">第十九條　履行本契約之通知</div>
  <p>
    除本契約另有約定外，租賃雙方相互間之通知，以郵寄為之者，應以本契約所記載之地址為準。<br>
    如因地址變更未告知他方，致通知無法到達時，以第一次郵遞之日期推定為到達日。<br>
    第一項之通知得經租賃雙方約定以即時通訊軟體(Line)以文字顯示方式為之。
  </p>

  <div class="section-title">第二十條　條款疑義處理</div>
  <p>
    本契約各條款如有疑義時，應為有利於承租人之解釋。
  </p>

  <div class="section-title">第二十一條　其他約定</div>
  <p>
    本契約租賃雙方不同意辦理公證。<br>
    本契約經辦理公證者，租賃雙方可約定公證書載明下列事項應逕受強制執行。
  </p>

  <div class="section-title">第二十二條　契約及其相關附件效力</div>
  <p>
    本契約自簽約日起生效，租賃雙方各執一份契約正本。<br>
    本契約廣告及相關附件視為本契約之一部分。
  </p>

  <div class="section-title">第二十三條　未盡事宜之處置</div>
  <p>
    本契約如有未盡事宜，依有關法令、習慣、平等互惠及誠實信用原則公平解決之。
  </p>

  <div class="section-title">附件</div>
  <ul>
    <li>雙方身分證明文件影本</li>
    <li>租賃標的現況確認書</li>
    <li>承租人負責修繕項目及範圍確認書</li>
    <li>附屬設備清單</li>
    <li>其他室內空間現狀照片</li>
    <li>退租點交房屋家具毀損相關賠償價目表</li>
  </ul>

  <div class="sign-area">
    <p>契約審閱權：本契約於中華民國 {{form.today}} 經承租人攜回審閱或放棄審閱之權利。</p>
<!-- 簽名區塊 -->
<table class="signature-table">
  <thead>
    <tr>
      <th>出租人簽章</th>
      <th>承租人簽章</th>
    </tr>
    <tr>
      <td>
    <div class="signature-cell">
      <img
        :src="form.landlordSignature"
        class="signature-img"
        alt="出租人簽名"
        style="cursor:pointer"
        @click="showLandlordPwdModal = true"
      />
      <div class="sign-line"></div>
      <div style="color:#888;font-size:0.92em;">點擊簽名（需密碼）</div>
    </div>
  </td>
  <!-- 密碼輸入彈窗 -->
  <div v-if="showLandlordPwdModal" class="modal-mask">
    <div class="modal-content">
      <h4>請輸入房東簽名密碼</h4>
      <input v-model="landlordPwdInput" type="password" placeholder="請輸入密碼" />
      <div v-if="landlordPwdError" style="color:red;">{{ landlordPwdError }}</div>
      <div style="margin-top:8px;">
        <button @click="handleLandlordPwdOk">確認</button>
        <button @click="showLandlordPwdModal = false" >取消</button>
      </div>
    </div>
  </div>
  <Signature v-model:visible="showLandlordSignModal" @confirm="setLandlordSignature" />

      <td>
        <div class="signature-cell">
          <img
            :src="form.signature"
            class="signature-img"
            alt="承租人簽名"
            style="cursor:pointer"
            @click="showSignModal = true"
          />
          <div class="sign-line"></div>
          <div style="color:#888;font-size:0.92em;">點擊簽名</div>
        </div>
      </td>
    </tr>
  </thead>
</table>
<!-- 簽名元件彈窗 -->
<Signature v-model:visible="showSignModal" @confirm="setSignature" />

    <p>立契約書人</p>
    <ul>
        <li>出租人：{{form.landlord}}，身分證字號：{{form.landlordId}}，聯絡電話：{{form.landlordPhone}}</li>
        <li>承租人：{{form.tenant}}，身分證字號：{{form.tenantId}}，聯絡電話：{{form.tenantPhone}}</li>
    </ul>

    <p>中華民國 {{form.today}}</p>
  </div>
  </div>
</template>