import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth';

// === 修改開始：將靜態匯入改為動態匯入 (Lazy Loading) ===

// 基礎頁面
const Identity = () => import('../views/auth/Identity.vue')
const Login = () => import('../views/auth/Login.vue')
const Register = () => import('../views/auth/Register.vue')
const Onboarding = () => import('../views/auth/Onboarding.vue')

// Layouts
const LandlordLayout = () => import('../layouts/LandlordLayout.vue')
const TenantLayout = () => import('../layouts/TenantLayout.vue')
const SuperAdminLayout = () => import('../layouts/SuperAdminLayout.vue')

// 房東端視圖
const LandlordDashboard = () => import('../views/landlord/Dashboard.vue')
const RoomManagement = () => import('../views/landlord/RoomManagement.vue')
const TenantList = () => import('../views/landlord/TenantList.vue')
const Financials = () => import('../views/landlord/Financials.vue')
const MeterReading = () => import('../views/landlord/MeterReading.vue')
const RepairRequests = () => import('../views/landlord/RepairRequests.vue')
const LandlordAnnouncements = () => import('../views/landlord/Announcements.vue')
const Contract = () => import('../views/landlord/Contract.vue')
const Receipts = () => import('../views/landlord/Receipts.vue')

// 租客端視圖
const TenantDashboard = () => import('../views/tenant/Dashboard.vue')
const TenantBills = () => import('../views/tenant/Bills.vue')
const TenantAnnouncements = () => import('../views/tenant/Announcements.vue')
const TenantRepairs = () => import('../views/tenant/Repairs.vue')
const TenantContact = () => import('../views/tenant/Contact.vue')

// 管理員視圖
const AdminDashboard = () => import('../views/admin/Dashboard.vue')

// === 修改結束 ===

// 暫位元件
const PlaceholderPage = { template: '<div class="p-8 text-center text-gray-500">此功能開發中...</div>' }

const routes = [
  { path: '/', name: 'Identity', component: Identity },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/onboarding', name: 'Onboarding', component: Onboarding, meta: { requiresAuth: true } },
  
  // 房東系統
  {
    path: '/landlord',
    component: LandlordLayout,
    meta: { requiresAuth: true, role: 'landlord' },
    children: [
      { path: 'dashboard', name: 'LandlordDashboard', component: LandlordDashboard },
      { path: 'rooms', name: 'RoomManagement', component: RoomManagement },
      { path: 'tenants', name: 'TenantList', component: TenantList },
      { path: 'announcements', name: 'LandlordAnnouncements', component: LandlordAnnouncements },
      { path: 'financials', name: 'Financials', component: Financials },
      { path: 'meter-reading', name: 'MeterReading', component: MeterReading },
      { path: 'repairs', name: 'RepairRequests', component: RepairRequests },
      { path: 'settings', name: 'Settings', component: PlaceholderPage },
      { path: 'contract', name: 'Contract', component: Contract },
      { path: 'receipts', name: 'Receipts', component: Receipts },
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
      { path: 'contact', name: 'ContactLandlord', component: TenantContact }
    ]
  },

  // 超級管理員系統
  {
    path: '/admin',
    component: SuperAdminLayout,
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: 'dashboard', name: 'AdminDashboard', component: AdminDashboard },
      { path: 'landlords', name: 'AdminLandlords', component: PlaceholderPage },
      { path: 'tenants', name: 'AdminTenants', component: PlaceholderPage },
      { path: 'database', name: 'AdminDatabase', component: PlaceholderPage },
    ]
  },

  // 通用導向
  {
    path: '/dashboard',
    name: 'Dashboard',
    redirect: () => {
       const authStore = useAuthStore();
       const role = authStore.userProfile?.role;
       
       if (role === 'landlord') return { name: 'LandlordDashboard' };
       if (role === 'tenant') return { name: 'TenantDashboard' };
       if (role === 'admin') return { name: 'AdminDashboard' };
       
       if (authStore.user) {
         return { name: 'Onboarding' };
       }

       return { name: 'Identity' };
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _, next) => {
  const authStore = useAuthStore();
  
  if (authStore.loading) {
    await authStore.init();
  }

  if (to.meta.requiresAuth && !authStore.user) {
    next({ name: 'Login' });
  } else {
    const userRole = authStore.userProfile?.role;
    const requiredRole = to.meta.role as string;

    if (requiredRole && userRole !== requiredRole) {
      if (userRole === 'landlord') next({ name: 'LandlordDashboard' });
      else if (userRole === 'tenant') next({ name: 'TenantDashboard' });
      else if (userRole === 'admin') next({ name: 'AdminDashboard' });
      else next({ name: 'Identity' });
    } else {
      next();
    }
  }
});

export default router