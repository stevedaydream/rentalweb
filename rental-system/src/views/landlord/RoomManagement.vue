<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          房源管理
        </h1>
        <p class="text-text-secondary-light">管理您的所有出租物業與房間狀態</p>
      </div>
      <div class="flex gap-3">
        <button 
          @click="openModal(undefined, 'create')"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">add</span>
          新增房源
        </button>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          @click="currentFilter = filter.value"
          class="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="currentFilter === filter.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'"
        >
          {{ filter.label }}
        </button>
      </div>
      
      <div class="relative w-full md:w-64">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜尋房號或地址..." 
          class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">載入房源資料中...</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="room in filteredRooms" 
        :key="room.id"
        class="group bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all overflow-hidden flex flex-col"
      >
        <div class="relative h-48 bg-gray-200 dark:bg-gray-800 overflow-hidden">
           <img 
            :src="getCoverImage(room)" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            alt="Room Image"
           >
           
           <div class="absolute top-3 right-3">
             <span 
              class="px-2.5 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border border-white/20"
              :class="statusColors[room.status]"
             >
               {{ statusLabels[room.status] }}
             </span>
           </div>
           
           <div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
             <span class="material-symbols-outlined text-[14px]">photo_library</span>
             {{ room.images?.length || 0 }}
           </div>

           <div class="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium">
             {{ room.type }}
           </div>
        </div>

        <div class="p-5 flex-1 flex flex-col">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">{{ room.name }}</h3>
            <span class="text-primary font-bold">NT$ {{ room.price.toLocaleString() }}</span>
          </div>
          
          <a 
            :href="getMapLink(room.address)" 
            target="_blank"
            class="text-sm text-text-secondary-light hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 mb-4 flex items-center group/addr"
            @click.stop
            title="在 Google 地圖開啟"
          >
            <span class="material-symbols-outlined text-[16px] mr-1 group-hover/addr:text-red-500 transition-colors">location_on</span>
            <span class="underline decoration-transparent group-hover/addr:decoration-current transition-all">{{ room.address }}</span>
          </a>

          <div class="border-t border-gray-100 dark:border-gray-800 my-3"></div>

          <div class="grid grid-cols-2 gap-2 text-sm text-text-secondary-light mb-4">
            <div class="flex items-center">
              <span class="material-symbols-outlined text-[18px] mr-2">bed</span>
              {{ room.layout }}
            </div>
            <div class="flex items-center">
              <span class="material-symbols-outlined text-[18px] mr-2">square_foot</span>
              {{ room.size }} 坪
            </div>
          </div>

          <div v-if="room.status === 'occupied'" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-200 text-xs font-bold">
              {{ room.tenantName?.[0] }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark truncate">{{ room.tenantName }}</p>
              <p class="text-xs text-text-secondary-light">合約至 {{ room.leaseEnd }}</p>
            </div>
          </div>
          <div v-else class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4 text-center text-sm text-text-secondary-light">
             目前無租客
          </div>

          <div class="mt-auto flex gap-2">
            <button 
              @click="openModal(room, 'edit')"
              class="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
            >
              編輯
            </button>
            <button 
              @click="openModal(room, 'view')"
              class="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              詳情
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && filteredRooms.length === 0" class="text-center py-12 bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-800 border-dashed">
      <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
        <span class="material-symbols-outlined text-3xl">domain_disabled</span>
      </div>
      <h3 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">找不到相符的房源</h3>
      <p class="text-text-secondary-light mt-1">請嘗試調整搜尋條件或新增房源</p>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ modalTitle }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6">
          
          <div class="space-y-3">
             <div class="flex justify-between items-end">
               <label class="block text-sm font-bold text-text-primary-light">
                 房源照片畫廊 
                 <span class="text-xs font-normal text-text-secondary-light ml-1">(最少 1 張，最多 10 張)</span>
               </label>
               <span class="text-xs font-bold" :class="form.images!.length >= 10 ? 'text-red-500' : 'text-blue-500'">
                 {{ form.images!.length }} / 10
               </span>
             </div>
             
             <div v-if="form.images!.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <div 
                  v-for="(img, index) in form.images" 
                  :key="index"
                  class="relative aspect-square rounded-xl overflow-hidden group border-2 transition-all cursor-pointer"
                  :class="form.coverImage === img ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'"
                  @click="!isViewMode && setCoverImage(img)"
                >
                  <img :src="img" class="w-full h-full object-cover">
                  
                  <div v-if="form.coverImage === img" class="absolute top-1 left-1 bg-yellow-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">
                    封面
                  </div>

                  <div v-if="!isViewMode" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                     <span v-if="form.coverImage !== img" class="text-xs text-white font-medium bg-black/50 px-2 py-1 rounded-full">點擊設為封面</span>
                     <button 
                        @click.stop="removeImage(index)"
                        class="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="刪除照片"
                     >
                       <span class="material-symbols-outlined text-[18px]">delete</span>
                     </button>
                  </div>
                </div>
             </div>

             <div 
               v-if="!isViewMode && form.images!.length < 10"
               class="relative w-full h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary transition-colors"
               :class="{ 'border-primary bg-blue-50 dark:bg-blue-900/10': isDragging }"
               @dragover.prevent="isDragging = true"
               @dragleave.prevent="isDragging = false"
               @drop.prevent="handleDrop"
               @click="triggerFileUpload"
             >
                <input 
                  type="file" 
                  ref="fileInput" 
                  class="hidden" 
                  accept="image/*"
                  multiple
                  @change="handleImageUpload"
                >
                
                <div v-if="uploading" class="flex items-center gap-2 text-primary">
                  <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-sm font-bold">上傳中...</span>
                </div>
                <div v-else class="flex flex-col items-center">
                   <span class="material-symbols-outlined text-2xl mb-1">add_photo_alternate</span>
                   <p class="text-xs font-medium">點擊或拖曳上傳 (支援批量)</p>
                </div>
             </div>
             
             <p v-if="!isViewMode" class="text-xs text-text-secondary-light">
               * 第一張照片將預設為封面，您也可以點擊圖片手動設定。
             </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-text-secondary-light mb-1">房源名稱 / 房號</label>
              <input 
                v-model="form.name" 
                type="text" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800" 
                placeholder="例如: 幸福公寓 A-201"
                :disabled="isViewMode"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">租金 (月)</label>
              <input 
                v-model="form.price" 
                type="number" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800" 
                placeholder="12000"
                :disabled="isViewMode"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">坪數</label>
              <input 
                v-model="form.size" 
                type="number" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800" 
                placeholder="8"
                :disabled="isViewMode"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">地址</label>
            <div class="relative">
              <input 
                v-model="form.address" 
                type="text" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800 pr-10" 
                placeholder="縣市/區域/街道"
                :disabled="isViewMode"
              >
              <a 
                v-if="form.address"
                :href="getMapLink(form.address)"
                target="_blank"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1"
                title="在 Google 地圖開啟"
              >
                <span class="material-symbols-outlined text-[20px]">map</span>
              </a>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">格局</label>
              <select 
                v-model="form.layout" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                :disabled="isViewMode"
              >
                <option>獨立套房</option>
                <option>分租套房</option>
                <option>雅房</option>
                <option>整層住家</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">狀態</label>
              <select 
                v-model="form.status" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                :disabled="isViewMode"
              >
                <option value="vacant">待租 (Vacant)</option>
                <option value="occupied">已租 (Occupied)</option>
                <option value="maintenance">維護中 (Maintenance)</option>
              </select>
            </div>
          </div>
          
          <div v-if="form.status === 'occupied'" class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
             <h4 class="text-sm font-bold mb-3 text-text-primary-light">租客資訊</h4>
             <div class="space-y-3">
               <input 
                v-model="form.tenantName" 
                type="text" 
                class="form-input !py-2 !text-sm disabled:bg-gray-200 dark:disabled:bg-gray-700" 
                placeholder="租客姓名"
                :disabled="isViewMode"
               >
               <input 
                v-model="form.leaseEnd" 
                type="date" 
                class="form-input !py-2 !text-sm disabled:bg-gray-200 dark:disabled:bg-gray-700"
                :disabled="isViewMode"
               >
             </div>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex items-center">
          <template v-if="isViewMode">
            <button 
              @click="switchToEdit"
              class="mr-auto px-4 py-2 rounded-xl text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium transition-colors flex items-center"
            >
              <span class="material-symbols-outlined mr-1 text-[20px]">edit</span>
              前往編輯
            </button>
            <button 
              @click="showModal = false"
              class="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 font-bold transition-colors"
            >
              關閉
            </button>
          </template>

          <template v-else>
            <button 
              v-if="isEditing"
              @click="deleteRoom"
              class="mr-auto px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 font-medium transition-colors flex items-center"
            >
              <span class="material-symbols-outlined mr-1 text-[20px]">delete</span>
              刪除房源
            </button>

            <div class="ml-auto flex gap-3">
              <button 
                @click="showModal = false"
                class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
              >
                取消
              </button>
              <button 
                @click="saveRoom"
                :disabled="uploading"
                class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ uploading ? '上傳中...' : '儲存' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db, storage } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth'; // [修改] 引入 AuthStore
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy,
  where // [修改] 引入 where
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- Type Definitions ---
interface Room {
  id: string; 
  name: string;
  address: string;
  price: number;
  size: number;
  layout: string;
  status: 'occupied' | 'vacant' | 'maintenance';
  type: string;
  images?: string[];
  coverImage?: string;
  tenantName?: string;
  leaseEnd?: string;
  landlordId?: string; // [新增]
}

// --- State ---
const authStore = useAuthStore(); // [新增]
const rooms = ref<Room[]>([]);
const loading = ref(true);

// Default placeholder
const defaultImage = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80'; 

// --- Firestore Integration ---

// 1. 實時監聽
onMounted(() => {
  if (!authStore.user) return;
  // [修改] 加入 landlordId 篩選，確保只看到自己的房源
  const q = query(
    collection(db, 'rooms'), 
    where('landlordId', '==', authStore.user.uid),
    orderBy('createdAt', 'desc')
  );
  
  onSnapshot(q, (snapshot) => {
    rooms.value = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Room));
    loading.value = false;
  }, (error) => {
    console.error("Error fetching rooms:", error);
    loading.value = false;
  });
});

// 2. 儲存與更新
const saveRoom = async () => {
  if (!authStore.user) return; // [新增] 安全檢查
  if (!form.value.name) return alert('請輸入房源名稱');
  const imgCount = form.value.images?.length || 0;
  if (imgCount < 1) return alert('請至少上傳 1 張照片');
  if (imgCount > 10) return alert('照片數量不能超過 10 張');

  try {
    // 決定封面照片
    const finalCover = form.value.coverImage || (form.value.images && form.value.images.length > 0 ? form.value.images[0] : defaultImage);
    
    // 整理要寫入的資料
    const roomData = {
      ...form.value,
      coverImage: finalCover,
      landlordId: authStore.user.uid, // [新增] 寫入房東 ID
      updatedAt: serverTimestamp()
    };
    
    // 移除 id 避免重複寫入文件內文
    delete (roomData as any).id; 

    if (isEditing.value && form.value.id) {
      // 編輯模式
      await updateDoc(doc(db, 'rooms', form.value.id), roomData);
    } else {
      // 新增模式
      await addDoc(collection(db, 'rooms'), {
        ...roomData,
        createdAt: serverTimestamp()
      });
    }
    
    showModal.value = false;
  } catch (err) {
    console.error(err);
    alert('儲存失敗');
  }
};

// 3. 刪除
const deleteRoom = async () => {
  if (!form.value.id || !form.value.name) return;
  if (confirm(`確定要刪除 ${form.value.name} 嗎？此操作無法復原。`)) {
    try {
      await deleteDoc(doc(db, 'rooms', form.value.id));
      showModal.value = false;
    } catch (err) {
      console.error(err);
      alert('刪除失敗');
    }
  }
};

// --- Filters & Search ---
const currentFilter = ref('all');
const searchQuery = ref('');

const filters = [
  { label: '全部', value: 'all' },
  { label: '出租中', value: 'occupied' },
  { label: '待租', value: 'vacant' },
  { label: '維修中', value: 'maintenance' }
];

const statusLabels = { occupied: '出租中', vacant: '待租', maintenance: '維護中' };
const statusColors = {
  occupied: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  vacant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
};

const filteredRooms = computed(() => {
  return rooms.value.filter(room => {
    if (currentFilter.value !== 'all' && room.status !== currentFilter.value) return false;
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      return room.name.toLowerCase().includes(q) || room.address.toLowerCase().includes(q);
    }
    return true;
  });
});

// --- Modal Logic ---
const showModal = ref(false);
const isEditing = ref(false);
const isViewMode = ref(false);

const form = ref<Partial<Room>>({
  name: '', price: 0, size: 0, address: '', layout: '獨立套房', status: 'vacant', 
  tenantName: '', leaseEnd: '', images: [], coverImage: ''
});

// --- Upload Logic ---
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const isDragging = ref(false);

const triggerFileUpload = () => fileInput.value?.click();

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (!isViewMode.value && e.dataTransfer?.files.length) {
    processFiles(e.dataTransfer.files);
  }
};

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFiles(target.files);
  }
};

const processFiles = async (fileList: FileList) => {
  const currentCount = form.value.images?.length || 0;
  const newCount = fileList.length;

  if (currentCount + newCount > 10) {
    alert(`圖片數量上限為 10 張，您目前已有 ${currentCount} 張，只能再上傳 ${10 - currentCount} 張。`);
    return;
  }

  uploading.value = true;
  const uploadPromises: Promise<string>[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (file && file.type.startsWith('image/')) {
      uploadPromises.push(uploadSingleFile(file));
    }
  }
  
  try {
    const newUrls = await Promise.all(uploadPromises);
    if (!form.value.images) form.value.images = [];
    form.value.images.push(...newUrls);
    
    // Auto-set cover if it's the first image
    if (!form.value.coverImage && form.value.images.length > 0) {
        form.value.coverImage = form.value.images[0];
    }
  } catch (e: any) {
    console.error(e);
    alert('部分圖片上傳失敗');
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
};

const uploadSingleFile = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
    const fileRef = storageRef(storage, `rooms/${fileName}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
};

const removeImage = (index: number) => {
    if (!form.value.images) return;
    const removedUrl = form.value.images[index];
    form.value.images.splice(index, 1);
    if (form.value.coverImage === removedUrl) {
        form.value.coverImage = form.value.images.length > 0 ? form.value.images[0] : '';
    }
};

const setCoverImage = (url: string) => { form.value.coverImage = url; };

const getCoverImage = (room: Room) => {
    if (room.coverImage) return room.coverImage;
    if (room.images && room.images.length > 0) return room.images[0];
    return defaultImage;
};

// --- Modal Core Logic ---
const getMapLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=$?q=${encodeURIComponent(address)}`;

const openModal = (room?: Room, mode: 'create' | 'edit' | 'view' = 'create') => {
  if (room) {
    form.value = JSON.parse(JSON.stringify(room));
    if (!form.value.images) form.value.images = [];
  } else {
    form.value = {
      name: '', price: 0, size: 0, address: '', layout: '獨立套房', status: 'vacant', 
      type: '公寓', tenantName: '', leaseEnd: '', images: [], coverImage: ''
    };
  }
  isEditing.value = !!room;
  isViewMode.value = mode === 'view';
  showModal.value = true;
};

const switchToEdit = () => {
  isViewMode.value = false;
  isEditing.value = true;
};

const modalTitle = computed(() => {
  if (isViewMode.value) return '房源詳情';
  return isEditing.value ? '編輯房源' : '新增房源';
});
</script>