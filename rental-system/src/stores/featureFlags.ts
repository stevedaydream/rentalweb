/**
 * 功能維護開關（system_config/features）。
 *
 * 一律「fail-open」：文件不存在、讀取失敗或還沒回來，都當作全部正常開放。
 * 這份設定的用途是臨時關掉壞掉的功能，不該因為它自己讀不到就把整站鎖死。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/config';
import { flagKey, type FeatureRole } from '../utils/featureFlags';

const CONFIG_PATH = ['system_config', 'features'] as const;
/** 首次導航最多等這麼久，逾時就先放行（之後 snapshot 回來仍會即時生效） */
const READY_TIMEOUT_MS = 3000;

export const useFeatureFlagStore = defineStore('featureFlags', () => {
  /** key = `${role}.${featureId}`，值為 true 代表「已停用」 */
  const disabled = ref<Record<string, boolean>>({});
  const loaded = ref(false);

  let unsub: Unsubscribe | null = null;
  let readyPromise: Promise<void> | null = null;

  const ensureLoaded = (): Promise<void> => {
    if (!readyPromise) {
      readyPromise = new Promise<void>((resolve) => {
        const done = () => { loaded.value = true; resolve(); };
        try {
          unsub = onSnapshot(
            doc(db, ...CONFIG_PATH),
            (snap) => { disabled.value = (snap.data()?.disabled as Record<string, boolean>) || {}; done(); },
            (e) => { console.warn('功能開關讀取失敗，維持全部開放:', e); done(); },
          );
        } catch (e) {
          console.warn('功能開關監聽建立失敗，維持全部開放:', e);
          done();
        }
        setTimeout(done, READY_TIMEOUT_MS);
      });
    }
    return readyPromise;
  };

  const stop = () => { unsub?.(); unsub = null; readyPromise = null; };

  const isDisabled = (role: FeatureRole, featureId: string): boolean =>
    disabled.value[flagKey(role, featureId)] === true;

  /** 管理員切換；只寫 disabled 這個欄位，其他設定不受影響 */
  const setDisabled = async (role: FeatureRole, featureId: string, next: boolean) => {
    const key = flagKey(role, featureId);
    await setDoc(
      doc(db, ...CONFIG_PATH),
      { disabled: { [key]: next }, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    disabled.value = { ...disabled.value, [key]: next };
  };

  return { disabled, loaded, ensureLoaded, stop, isDisabled, setDisabled };
});
