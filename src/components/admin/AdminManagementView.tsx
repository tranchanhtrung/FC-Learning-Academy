import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole, ProficiencyLevel } from '../../types';
import { isUserDisabledRecord } from '../../lib/firebase';
import { DataImportCenterView } from './DataImportCenterView';
import { RolePermissionsControlPanel } from './RolePermissionsControlPanel';
import { LessonMaterialsManager } from '../courses/LessonMaterialsManager';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminCommerceTab } from './AdminCommerceTab';
import { AdminMarketingTab } from './AdminMarketingTab';
import { AdminMaterialApprovalTab } from './AdminMaterialApprovalTab';
import { AdminSiteSettingsTab } from './AdminSiteSettingsTab';
import {
  Settings,
  Database,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  ShieldCheck,
  Shield,
  LayoutDashboard,
  Users,
  Tag,
  Megaphone,
  FileCheck2,
  Sliders,
  Building2,
  Activity,
  Search,
  CheckCircle2,
  Upload,
} from 'lucide-react';

type AdminTabId =
  | 'overview'
  | 'users'
  | 'commerce'
  | 'marketing'
  | 'materials'
  | 'settings'
  | 'permissions'
  | 'properties'
  | 'system'
  | 'dataImport';

const PROPERTIES_META = [
  {
    name: 'Grand Horizon Saigon Hotel & Residences',
    keysVi: '350 phòng + 120 căn hộ dịch vụ cao cấp',
    keysEn: '350 rooms + 120 luxury serviced residences',
    gm: 'Richard Vance',
    fc: 'David Tran',
    brand: 'Luxury Collection Benchmark',
  },
  {
    name: 'Royal Palm Resort & Spa Danang',
    keysVi: '450 phòng & Biệt thự biển 5 sao',
    keysEn: '450 rooms & 5-star beachfront villas',
    gm: 'Helena Berg',
    fc: 'Sarah Jenkins',
    brand: 'Resort & Lifestyle Benchmark',
  },
  {
    name: 'Marina Bay Heritage Hotel Hanoi',
    keysVi: '280 phòng di sản tại trung tâm phố cổ',
    keysEn: '280 heritage keys in the Old Quarter',
    gm: 'Thomas Laurent',
    fc: 'David Tran (Cluster)',
    brand: 'Boutique Heritage Benchmark',
  },
  {
    name: 'Emerald Bay Luxury Suites Nha Trang',
    keysVi: '310 căn hộ nghỉ dưỡng biển',
    keysEn: '310 beachfront luxury resort suites',
    gm: 'Arthur Pendelton',
    fc: 'Sarah Jenkins (Cluster)',
    brand: 'Extended Stay Luxury',
  },
];

export const AdminManagementView: React.FC = () => {
  const {
    users,
    currentUser,
    auditLogs,
    lessonMaterials,
    getMaterialApprovalStatus,
    addUser,
    updateUser,
    disableUser,
    showToast,
    language,
    t,
    firebaseProfile,
    officialAuthUser,
    dataSourceMode,
    systemConfig,
    syncAllExperienceRolesToFirestore,
    hasPermission,
  } = useApp();

  const isVi = language === 'vi';
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabId>('overview');
  const [materialsSubTab, setMaterialsSubTab] = useState<'approval' | 'upload'>('approval');
  const [syncingRoles, setSyncingRoles] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'pending_role' | UserRole>('all');
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [pendingDisableUser, setPendingDisableUser] = useState<User | null>(null);
  const [disablingUser, setDisablingUser] = useState<boolean>(false);

  const visibleUsers = useMemo(
    () => users.filter((u) => !isUserDisabledRecord(u)),
    [users]
  );

  const pendingRoleRequestsCount = useMemo(
    () => visibleUsers.filter((u) => u.requestedRole && u.requestedRole !== u.role).length,
    [visibleUsers]
  );

  const pendingMaterialsCount = useMemo(
    () => lessonMaterials.filter((m) => getMaterialApprovalStatus(m) === 'pending').length,
    [lessonMaterials, getMaterialApprovalStatus]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return visibleUsers.filter((u) => {
      if (userRoleFilter === 'pending_role') {
        if (!u.requestedRole || u.requestedRole === u.role) return false;
      } else if (userRoleFilter !== 'all' && u.role !== userRoleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q) ||
        (u.property || '').toLowerCase().includes(q)
      );
    });
  }, [visibleUsers, userSearch, userRoleFilter]);

  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: UserRole;
    position: string;
    department: string;
    property: string;
    currentLevel: ProficiencyLevel;
    targetLevel: ProficiencyLevel;
  }>({
    name: '',
    email: '',
    role: 'learner',
    position: 'Senior Accountant',
    department: 'Finance & Accounting',
    property: 'Grand Horizon Saigon Hotel & Residences',
    currentLevel: 2,
    targetLevel: 4,
  });

  const canManageUsers = hasPermission('manage_users_rbac');
  const canConfigurePermissions = hasPermission('configure_role_permissions');
  const canManageLessonMaterials = hasPermission('manage_lesson_materials');
  const canAccessDataImport = hasPermission('access_data_import_center');
  const canManageSite = canManageUsers || canConfigurePermissions || currentUser.role === 'super_admin';
  const canViewSystemAudit = canManageUsers || canConfigurePermissions || canAccessDataImport;

  const allowedAdminTabs = useMemo(() => {
    const list: AdminTabId[] = ['overview'];
    if (canManageUsers) list.push('users');
    if (canManageSite) {
      list.push('commerce', 'marketing');
    }
    if (canManageLessonMaterials || canManageSite) list.push('materials');
    if (canManageSite) list.push('settings');
    if (canConfigurePermissions) list.push('permissions');
    list.push('properties');
    if (canViewSystemAudit) list.push('system');
    if (canAccessDataImport) list.push('dataImport');
    return list;
  }, [
    canManageUsers,
    canManageSite,
    canManageLessonMaterials,
    canConfigurePermissions,
    canViewSystemAudit,
    canAccessDataImport,
  ]);

  useEffect(() => {
    if (!allowedAdminTabs.includes(activeAdminTab)) {
      setActiveAdminTab(allowedAdminTabs[0] || 'overview');
    }
  }, [allowedAdminTabs, activeAdminTab]);

  const openAddModal = () => {
    setEditingUserId(null);
    setUserForm({
      name: '',
      email: '',
      role: 'learner',
      position: 'Senior Accountant',
      department: 'Finance & Accounting',
      property: 'Grand Horizon Saigon Hotel & Residences',
      currentLevel: 2,
      targetLevel: 4,
    });
    setUserModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUserId(u.id);
    setUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
      position: u.position,
      department: u.department,
      property: u.property,
      currentLevel: u.currentLevel,
      targetLevel: u.targetLevel,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) {
      showToast(isVi ? 'Vui lòng nhập họ tên và email.' : 'Name and email are required.', 'error');
      return;
    }

    if (editingUserId) {
      const updated = await updateUser(editingUserId, userForm);
      if (updated) {
        showToast(
          isVi ? `Đã cập nhật thông tin ${updated.name}.` : `Updated user ${updated.name}.`,
          'success'
        );
        setUserModalOpen(false);
      }
    } else {
      const created = await addUser(userForm);
      if (created) {
        showToast(
          isVi ? `Đã tạo tài khoản ${created.name}.` : `Created user ${created.name}.`,
          'success'
        );
        setUserModalOpen(false);
      }
    }
  };

  const handleQuickApproveRole = async (u: User) => {
    if (!u.requestedRole || u.requestedRole === u.role) return;
    setApprovingUserId(u.id);
    try {
      const updated = await updateUser(u.id, {
        role: u.requestedRole,
        requestedRole: u.requestedRole,
      });
      if (updated) {
        showToast(
          isVi
            ? `Đã duyệt nâng vai trò ${updated.name} thành ${t.roles[u.requestedRole]}!`
            : `Approved role upgrade for ${updated.name} to ${t.roles[u.requestedRole]}!`,
          'success'
        );
      }
    } finally {
      setApprovingUserId(null);
    }
  };

  const allTabItems: Array<{
    id: AdminTabId;
    labelVi: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', labelVi: 'Tổng Quan', labelEn: 'Overview', icon: LayoutDashboard },
    {
      id: 'users',
      labelVi: 'Người Dùng',
      labelEn: 'Users',
      icon: Users,
      badge: pendingRoleRequestsCount > 0 ? pendingRoleRequestsCount : undefined,
    },
    { id: 'commerce', labelVi: 'Giá, Combo & Đơn Hàng', labelEn: 'Pricing, Combos & Orders', icon: Tag },
    { id: 'marketing', labelVi: 'Thông Báo & Quảng Cáo', labelEn: 'Announcements & Ads', icon: Megaphone },
    {
      id: 'materials',
      labelVi: 'Duyệt & Upload Tài Liệu',
      labelEn: 'Materials & Approval',
      icon: FileCheck2,
      badge: pendingMaterialsCount > 0 ? pendingMaterialsCount : undefined,
    },
    { id: 'settings', labelVi: 'Cài Đặt & VietQR', labelEn: 'Site & VietQR', icon: Sliders },
    { id: 'permissions', labelVi: 'Phân Quyền (RBAC)', labelEn: 'RBAC Matrix', icon: Shield },
    { id: 'properties', labelVi: 'Khách Sạn', labelEn: 'Properties', icon: Building2 },
    { id: 'system', labelVi: 'Kiến Trúc & Audit', labelEn: 'System & Audit', icon: Activity },
    { id: 'dataImport', labelVi: 'Nhập Dữ Liệu', labelEn: 'Data Import', icon: Database },
  ];
  const tabItems = allTabItems.filter((item) => allowedAdminTabs.includes(item.id));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0A192F] via-[#122645] to-[#1E3A8A] text-white p-6 sm:p-8 rounded-2xl border border-slate-700/60 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Enterprise Admin Control Center</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {isVi ? 'Trung Tâm Quản Trị Toàn Diện Hệ Thống' : t.nav.administration}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {isVi
              ? 'Quản lý bảng giá từng khóa học, gói Combo nhiều khóa, mã giảm giá, thông báo hệ thống, banner quảng cáo, kiểm duyệt tài liệu, tài khoản VietQR, người dùng và phân quyền RBAC.'
              : 'Manage individual course pricing, multi-course combos, coupons, broadcasts, ad banners, document moderation, VietQR bank settings, users, and RBAC policies.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-xs">
            {t.roles[currentUser.role]}
          </span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveAdminTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{isVi ? tab.labelVi : tab.labelEn}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono leading-none ${
                      active ? 'bg-amber-400 text-slate-950' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* NEW ENTERPRISE ADMIN TABS */}
      {activeAdminTab === 'overview' && (
        <AdminOverviewTab onNavigateTab={(tab) => setActiveAdminTab(tab)} />
      )}
      {activeAdminTab === 'commerce' && canManageSite && <AdminCommerceTab />}
      {activeAdminTab === 'marketing' && canManageSite && <AdminMarketingTab />}
      {activeAdminTab === 'materials' && (canManageLessonMaterials || canManageSite) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMaterialsSubTab('approval')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  materialsSubTab === 'approval'
                    ? 'bg-[#0A192F] text-amber-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>
                  {isVi
                    ? `Kiểm Duyệt Tài Liệu (${pendingMaterialsCount} chờ duyệt)`
                    : `Moderation Queue (${pendingMaterialsCount} pending)`}
                </span>
              </button>
              {canManageLessonMaterials && (
                <button
                  type="button"
                  onClick={() => setMaterialsSubTab('upload')}
                  className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    materialsSubTab === 'upload'
                      ? 'bg-[#0A192F] text-amber-400 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Upload Học Liệu Mới' : 'Upload Lesson Material'}</span>
                </button>
              )}
            </div>
          </div>

          {materialsSubTab === 'approval' ? (
            <AdminMaterialApprovalTab />
          ) : (
            <LessonMaterialsManager />
          )}
        </div>
      )}
      {activeAdminTab === 'settings' && canManageSite && <AdminSiteSettingsTab />}
      {activeAdminTab === 'permissions' && canConfigurePermissions && <RolePermissionsControlPanel />}
      {activeAdminTab === 'dataImport' && canAccessDataImport && <DataImportCenterView />}

      {/* USERS & ROLE APPROVAL TAB */}
      {activeAdminTab === 'users' && canManageUsers && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex flex-wrap items-center gap-2">
                <span>
                  {isVi
                    ? `Danh Sách Nhân Sự & Phân Quyền Hệ Thống (${filteredUsers.length}/${visibleUsers.length})`
                    : `System Users & Role Permissions (${filteredUsers.length}/${visibleUsers.length})`}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    dataSourceMode === 'firestore'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {dataSourceMode === 'firestore' ? 'Firestore /userProfiles' : 'Local / Express'}
                </span>
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {firebaseProfile?.isAdmin && systemConfig.demoModeEnabled && (
                <button
                  type="button"
                  disabled={syncingRoles}
                  onClick={async () => {
                    setSyncingRoles(true);
                    try {
                      await syncAllExperienceRolesToFirestore(false);
                    } finally {
                      setSyncingRoles(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingRoles ? 'animate-spin' : ''}`} />
                  <span>
                    {isVi ? 'Khai Báo Vai Trò Lên Firestore' : 'Sync Roles to Firestore'}
                  </span>
                </button>
              )}
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isVi ? 'Tạo tài khoản mới' : 'Add User'}</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={
                  isVi
                    ? 'Tìm theo tên, email, chức vụ, khách sạn...'
                    : 'Search by name, email, job title, property...'
                }
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pendingRoleRequestsCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setUserRoleFilter((prev) => (prev === 'pending_role' ? 'all' : 'pending_role'))
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                    userRoleFilter === 'pending_role'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {isVi
                    ? `Chờ duyệt vai trò (${pendingRoleRequestsCount})`
                    : `Role requests (${pendingRoleRequestsCount})`}
                </button>
              )}

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700"
              >
                <option value="all">{isVi ? 'Tất cả vai trò' : 'All Roles'}</option>
                <option value="pending_role">
                  {isVi ? 'Đang đề xuất nâng vai trò' : 'Pending Role Upgrade'}
                </option>
                <option value="learner">{t.roles.learner}</option>
                <option value="financial_controller">{t.roles.financial_controller}</option>
                <option value="lnd_manager">{t.roles.lnd_manager}</option>
                <option value="general_manager">{t.roles.general_manager}</option>
                <option value="super_admin">{t.roles.super_admin}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{isVi ? 'Họ và tên' : 'Full Name'}</th>
                  <th className="py-2.5 px-3">{isVi ? 'Vai trò hệ thống' : 'System Role'}</th>
                  <th className="py-2.5 px-3">{isVi ? 'Chức vụ chuyên môn' : 'Job Title'}</th>
                  <th className="py-2.5 px-3">{isVi ? 'Đơn vị công tác' : 'Property'}</th>
                  <th className="py-2.5 px-3 text-center">{isVi ? 'Cấp độ' : 'Level'}</th>
                  <th className="py-2.5 px-3 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {isVi
                        ? 'Không tìm thấy nhân sự phù hợp bộ lọc.'
                        : 'No matching users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSignedInOwner = officialAuthUser?.id === u.id;
                    const isProtectedAccount =
                      isSignedInOwner ||
                      currentUser.id === u.id ||
                      (u.email || '').toLowerCase() === 'tranchanhtrung@gmail.com';
                    const hasRoleRequest = Boolean(u.requestedRole && u.requestedRole !== u.role);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2.5">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1.5">
                              {u.name}
                              {isSignedInOwner && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  You
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal truncate">
                              {u.email}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {t.roles[u.role]}
                          </span>
                          {hasRoleRequest && u.requestedRole && (
                            <span className="block mt-1 text-[10px] font-semibold text-amber-700">
                              {isVi ? 'Đề xuất: ' : 'Requested: '}
                              {t.roles[u.requestedRole]}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">{u.position}</td>
                        <td className="py-3 px-3 text-slate-500 truncate max-w-[200px]">
                          {u.property}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                          Level {u.currentLevel} / {u.targetLevel}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {hasRoleRequest && (
                              <button
                                type="button"
                                disabled={approvingUserId === u.id}
                                onClick={() => void handleQuickApproveRole(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer transition-colors disabled:opacity-50"
                                title={
                                  isVi
                                    ? 'Chấp thuận nâng vai trò theo đề xuất của người dùng'
                                    : 'Approve requested role upgrade'
                                }
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isVi ? 'Duyệt vai trò' : 'Approve Role'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{isVi ? 'Sửa' : 'Edit'}</span>
                            </button>
                            {!isProtectedAccount && (
                              <button
                                type="button"
                                onClick={() => setPendingDisableUser(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold text-[11px] cursor-pointer transition-colors"
                                title={
                                  isVi
                                    ? 'Chuyển tài khoản sang trạng thái vô hiệu hóa (Disabled) và ẩn khỏi danh sách'
                                    : 'Disable and hide this user account'
                                }
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{isVi ? 'Xoá' : 'Delete'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Properties Tab */}
      {activeAdminTab === 'properties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROPERTIES_META.map((p, idx) => {
            const learnerCount = visibleUsers.filter(
              (u) => u.role === 'learner' && u.property === p.name
            ).length;
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    {p.brand}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {learnerCount} {isVi ? 'học viên' : 'learners'}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">{p.name}</h4>
                <p className="text-xs text-slate-500">{isVi ? p.keysVi : p.keysEn}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span>
                    GM: <strong>{p.gm}</strong>
                  </span>
                  <span>
                    FC: <strong>{p.fc}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Architecture & Audit Logs Tab */}
      {activeAdminTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>
                {isVi
                  ? 'Kiến Trúc Kỹ Thuật & Cấu Hình Dịch Vụ Đám Mây'
                  : 'Technical Architecture & Cloud Service Status'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[11px] text-emerald-700 font-bold block uppercase">
                  AI Model Server
                </span>
                <p className="font-bold text-slate-900 mt-1">Google Gemini AI</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Server-Side Curriculum Proxy (/api/gemini/*)
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[10px] text-blue-700 font-bold block uppercase">
                  Data & Auth Cloud Engine
                </span>
                <p className="font-bold text-slate-900 mt-1">
                  {dataSourceMode === 'firestore'
                    ? 'Firebase Auth + Firestore Live'
                    : systemConfig.databaseDriver === 'postgresql'
                    ? 'PostgreSQL Production'
                    : 'Express Serverless + Firestore'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Storage:{' '}
                  {systemConfig.storageDriver === 'cloudflare_r2'
                    ? 'Cloudflare R2 (0đ Egress)'
                    : 'Firebase / Direct Storage'}
                </p>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-[10px] text-purple-700 font-bold block uppercase">
                  Security & RBAC
                </span>
                <p className="font-bold text-slate-900 mt-1">Role-Based Access Control</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  5 Granular Roles & Live Server Audit Trail
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              {isVi
                ? `Nhật Ký Kiểm Toán Vận Hành (${auditLogs.length})`
                : `Operational Audit Logs (${auditLogs.length})`}
            </h4>
            <div className="space-y-2 text-xs max-h-[420px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-slate-400 italic py-4 text-center">
                  {isVi ? 'Chưa có nhật ký kiểm toán nào.' : 'No audit log entries recorded.'}
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 font-mono">
                          {log.action}
                        </span>
                        <span className="font-bold text-slate-800">{log.actor}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="text-slate-700">{log.target}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{log.details}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {userModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUserModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveUser}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingUserId
                  ? isVi
                    ? 'Cập Nhật Tài Khoản Nhân Sự'
                    : 'Edit User Account'
                  : isVi
                  ? 'Tạo Tài Khoản Nhân Sự Mới'
                  : 'Create New User Account'}
              </h3>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Họ và tên' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Vai trò (RBAC Role)' : 'System Role (RBAC)'}
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="learner">{t.roles.learner}</option>
                  <option value="financial_controller">{t.roles.financial_controller}</option>
                  <option value="lnd_manager">{t.roles.lnd_manager}</option>
                  <option value="general_manager">{t.roles.general_manager}</option>
                  <option value="super_admin">{t.roles.super_admin}</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Chức vụ chuyên môn' : 'Job Title'}
                </label>
                <input
                  type="text"
                  value={userForm.position}
                  onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {isVi ? 'Khách sạn / Đơn vị' : 'Hotel / Property'}
              </label>
              <select
                value={userForm.property}
                onChange={(e) => setUserForm({ ...userForm, property: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {PROPERTIES_META.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
                <option value="Cluster Corporate Finance Office">
                  Cluster Corporate Finance Office
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Cấp độ hiện tại' : 'Current Level'}
                </label>
                <select
                  value={userForm.currentLevel}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      currentLevel: Number(e.target.value) as ProficiencyLevel,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Cấp độ mục tiêu' : 'Target Level'}
                </label>
                <select
                  value={userForm.targetLevel}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      targetLevel: Number(e.target.value) as ProficiencyLevel,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer"
              >
                {t.common.save}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Soft-Disable User Confirmation Modal */}
      {pendingDisableUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !disablingUser) setPendingDisableUser(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isVi
                      ? 'Xác Nhận Xoá (Vô Hiệu Hóa) Tài Khoản'
                      : 'Confirm Disable User Account'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isVi
                      ? 'Chuyển trạng thái sang Disabled và ẩn khỏi hệ thống'
                      : 'Set account status to disabled and hide from directory'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={disablingUser}
                onClick={() => setPendingDisableUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <img
                src={pendingDisableUser.avatar}
                alt={pendingDisableUser.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{pendingDisableUser.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{pendingDisableUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-bold text-[10px]">
                  {t.roles[pendingDisableUser.role]}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 space-y-1 leading-relaxed">
              <p className="font-bold">
                {isVi ? 'Thao tác này sẽ thực hiện:' : 'This action will:'}
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-800">
                <li>
                  {isVi
                    ? 'Chuyển trạng thái tài khoản sang Disabled (vô hiệu hóa) và thu hồi quyền đăng nhập.'
                    : 'Set account status to Disabled and revoke sign-in access.'}
                </li>
                <li>
                  {isVi
                    ? 'Ẩn hoàn toàn khỏi danh sách nhân sự và menu chuyển đổi vai trò.'
                    : 'Hide the user completely from the staff directory and role menus.'}
                </li>
                <li>
                  {isVi
                    ? 'Bảo toàn lịch sử đào tạo, kết quả đánh giá và nhật ký kiểm toán.'
                    : 'Preserve historical training, assessment, and audit trail records.'}
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={disablingUser}
                onClick={() => setPendingDisableUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={disablingUser}
                onClick={async () => {
                  setDisablingUser(true);
                  try {
                    const ok = await disableUser(pendingDisableUser.id);
                    if (ok) {
                      setPendingDisableUser(null);
                    }
                  } finally {
                    setDisablingUser(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {disablingUser
                    ? isVi
                      ? 'Đang xử lý...'
                      : 'Disabling...'
                    : isVi
                    ? 'Xác Nhận Xoá'
                    : 'Confirm Disable'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
