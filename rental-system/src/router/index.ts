// [修改開始]：src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { auth } from '../firebase/config';

// 輔助函式：確保 Firebase Auth 初始化完成
const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const removeListener = auth.onAuthStateChanged((user) => {
      removeListener();
      resolve(user);
    }, reject);
  });
};

// 視圖組件導入
const Identity = () => import('../views/auth/Identity.vue');
const Login = () => import('../views/auth/Login.vue');
const Register = () => import('../views/auth/Register.vue');
const Onboarding = () => import('../views/auth/Onboarding.vue');

const LandlordLayout = () => import('../layouts/LandlordLayout.vue');
const TenantLayout = () => import('../layouts/TenantLayout.vue');
const SuperAdminLayout = () => import('../layouts/SuperAdminLayout.vue');

const LandlordDashboard = () => import('../views/landlord/Dashboard.vue');
const RoomManagement = () => import('../views/landlord/RoomManagement.vue');
const TenantList = () => import('../views/landlord/TenantList.vue');
const Financials = () => import('../views/landlord/Financials.vue');
const MeterReading = () => import('../views/landlord/MeterReading.vue');
const MeterReadingHistory = () => import('../views/landlord/MeterReadingHistory.vue');
const RepairRequests = () => import('../views/landlord/RepairRequests.vue');
const LandlordAnnouncements = () => import('../views/landlord/Announcements.vue');
const Contract = () => import('../views/landlord/Contract.vue');
const Receipts = () => import('../views/landlord/Receipts.vue');
const LandlordSettings = () => import('../views/landlord/Settings.vue');
const LandlordMessages = () => import('../views/landlord/Messages.vue');
const InvestmentCalculator = () => import('../views/landlord/InvestmentCalculator.vue');
const LandlordBuildingInfo = () => import('../views/landlord/BuildingInfo.vue');

const TenantDashboard = () => import('../views/tenant/Dashboard.vue');
const TenantBills = () => import('../views/tenant/Bills.vue');
const TenantAnnouncements = () => import('../views/tenant/Announcements.vue');
const TenantRepairs = () => import('../views/tenant/Repairs.vue');
const TenantContact = () => import('../views/tenant/Contact.vue');
const TenantBuildingInfo = () => import('../views/tenant/BuildingInfo.vue');

const AdminLogin = () => import('../views/admin/AdminLogin.vue');
const AdminDashboard = () => import('../views/admin/Dashboard.vue');
const AdminLandlords = () => import('../views/admin/LandlordManagement.vue');
const AdminDatabase = () => import('../views/admin/DatabaseManagement.vue');
const AdminTenants = () => import('../views/admin/TenantManagement.vue');

const RoomExplore = () => import('../views/explore/RoomExplore.vue');
const LandlordProfile = () => import('../views/explore/LandlordProfile.vue');
const LandlordReviews = () => import('../views/landlord/Reviews.vue');

const routes = [
  { path: '/', name: 'Identity', component: Identity },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/onboarding', name: 'Onboarding', component: Onboarding, meta: { requiresAuth: true } },
  { path: '/explore', name: 'RoomExplore', component: RoomExplore },
  { path: '/explore/landlord/:landlordId', name: 'LandlordProfile', component: LandlordProfile },
  { path: '/admin/login', name: 'AdminLogin', component: AdminLogin },
  
  // 房東系統
  {
    path: '/landlord',
    component: LandlordLayout,
    meta: { requiresAuth: true, role: 'landlord' },
    children: [
      { path: 'dashboard', name: 'LandlordDashboard', component: LandlordDashboard },
      { path: 'messages', name: 'LandlordMessages', component: LandlordMessages },
      { path: 'rooms', name: 'RoomManagement', component: RoomManagement },
      { path: 'tenants', name: 'TenantList', component: TenantList },
      { path: 'announcements', name: 'LandlordAnnouncements', component: LandlordAnnouncements },
      { path: 'financials', name: 'Financials', component: Financials },
      { path: 'meter-reading', name: 'MeterReading', component: MeterReading },
      { path: 'meter-history', name: 'MeterReadingHistory', component: MeterReadingHistory },
      { path: 'repairs', name: 'RepairRequests', component: RepairRequests },
      { path: 'settings', name: 'Settings', component: LandlordSettings },
      { path: 'contract', name: 'Contract', component: Contract },
      { path: 'receipts', name: 'Receipts', component: Receipts },
      { path: 'investment', name: 'InvestmentCalculator', component: InvestmentCalculator },
      { path: 'building-info', name: 'LandlordBuildingInfo', component: LandlordBuildingInfo },
      { path: 'reviews', name: 'LandlordReviews', component: LandlordReviews },
    ]
  },

  // 租客系統
  {
    path: '/tenant',
    component: TenantLayout,
    meta: { requiresAuth: true, role: 'tenant' },
    children: [
      { path: 'dashboard', name: 'TenantDashboard', component: TenantDashboard },
      { path: 'bills', name: 'TenantBills', component: TenantBills },
      { path: 'announcements', name: 'TenantAnnouncements', component: TenantAnnouncements },
      { path: 'repairs', name: 'TenantRepairs', component: TenantRepairs },
      { path: 'contact', name: 'ContactLandlord', component: TenantContact },
      { path: 'building-info', name: 'TenantBuildingInfo', component: TenantBuildingInfo },
    ]
  },

  // 管理員系統
  {
    path: '/admin',
    component: SuperAdminLayout,
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: 'dashboard', name: 'AdminDashboard', component: AdminDashboard },
      { path: 'landlords', name: 'AdminLandlords', component: AdminLandlords },
      { path: 'tenants', name: 'AdminTenants', component: AdminTenants },
      { path: 'database', name: 'AdminDatabase', component: AdminDatabase },
      {
        path: 'simulator',
        name: 'SystemSimulator',
        component: () => import('../views/admin/SystemSimulator.vue')
      },
    ]
  },

  // 自動分流導向
  {
    path: '/dashboard',
    name: 'Dashboard',
    redirect: () => {
      const authStore = useAuthStore();
      const role = authStore.userProfile?.role;
      if (role === 'landlord') return { name: 'LandlordDashboard' };
      if (role === 'tenant') return { name: 'TenantDashboard' };
      if (role === 'admin') return { name: 'AdminDashboard' };
      return authStore.user ? { name: 'Onboarding' } : { name: 'Identity' };
    }
  },

  // 404 catch-all（必須放最後）
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守衛核心
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // 1. 初始化狀態檢查
  if (!authStore.isInitialized) {
    await authStore.init();
  }

  // 2. 獲取最即時的 Firebase 用戶狀態
  const firebaseUser = await getCurrentUser();
  const isAuthenticated = !!firebaseUser;

  // 3. 處理已登入用戶嘗試訪問 Auth 頁面（/explore 相關頁面永遠可訪問）
  if (to.name === 'RoomExplore' || to.name === 'LandlordProfile') return next();
  const isAuthPage = ['Identity', 'Login', 'Register', 'AdminLogin'].includes(to.name as string);
  if (isAuthenticated && isAuthPage) {
    const userRole = authStore.userProfile?.role;
    if (userRole === 'landlord') return next({ name: 'LandlordDashboard' });
    if (userRole === 'tenant') return next({ name: 'TenantDashboard' });
    if (userRole === 'admin') return next({ name: 'AdminDashboard' });
    return next({ name: 'Onboarding' });
  }

  // 4. 權限檢查
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.warn('[Guard] 未登入，導向 Login');
    return next({ name: 'Login' });
  }

  // 5. 角色訪問限制
  if (isAuthenticated && to.meta.role) {
    const userRole = authStore.userProfile?.role;
    const requiredRole = to.meta.role as string;

    if (userRole !== requiredRole) {
      // Admin 正在模擬房東時，允許進入房東路由
      if (userRole === 'admin' && requiredRole === 'landlord' && authStore.impersonatingLandlord) {
        return next();
      }
      console.warn(`[Guard] 角色不符，目前是: ${userRole}`);
      if (userRole === 'landlord') return next({ name: 'LandlordDashboard' });
      if (userRole === 'tenant') return next({ name: 'TenantDashboard' });
      if (userRole === 'admin') return next({ name: 'AdminDashboard' });
      return next({ name: 'Identity' });
    }
  }

  next();
});

export default router;
// [修改結束]