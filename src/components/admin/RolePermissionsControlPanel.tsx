import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  ROLE_META,
  SYSTEM_ROLES,
  sanitizeRolePermissionsList,
} from '../../lib/rbac';
import { PermissionCategory, PermissionKey, RolePermissionsMap, UserRole } from '../../types';
import {
  Check,
  Database,
  Lock,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

export const RolePermissionsControlPanel: React.FC = () => {
  const {
    currentUser,
    users,
    t,
    language,
    dataSourceMode,
    rolePermissions,
    rolePermissionMeta,
    hasPermission,
    saveAllRolePermissions,
    resetRolePermissions,
    showToast,
  } = useApp();

  const isVi = language === 'vi';
  const canConfigure = hasPermission('configure_role_permissions');

  const [draftMap, setDraftMap] = useState<RolePermissionsMap>(() => ({ ...rolePermissions }));
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PermissionCategory>('all');
  const [onlyModified, setOnlyModified] = useState(false);
  const [focusedRole, setFocusedRole] = useState<UserRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Sync draft whenever authoritative policy changes remotely/on reset
  useEffect(() => {
    setDraftMap({ ...rolePermissions });
  }, [rolePermissions]);

  // Count unsaved cell diffs between draftMap and persisted rolePermissions
  const unsavedChangesCount = useMemo(() => {
    let diff = 0;
    for (const role of SYSTEM_ROLES) {
      const savedSet = new Set(rolePermissions[role] || []);
      const draftSet = new Set(draftMap[role] || []);
      for (const key of ALL_PERMISSION_KEYS) {
        if (savedSet.has(key) !== draftSet.has(key)) diff++;
      }
    }
    return diff;
  }, [draftMap, rolePermissions]);

  // Count total diffs against baseline defaults
  const baselineDeviationCount = useMemo(() => {
    let diff = 0;
    for (const role of SYSTEM_ROLES) {
      const defSet = new Set(DEFAULT_ROLE_PERMISSIONS[role]);
      const draftSet = new Set(draftMap[role] || []);
      for (const key of ALL_PERMISSION_KEYS) {
        if (defSet.has(key) !== draftSet.has(key)) diff++;
      }
    }
    return diff;
  }, [draftMap]);

  const filteredPermissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PERMISSION_CATALOG.filter((perm) => {
      if (categoryFilter !== 'all' && perm.category !== categoryFilter) return false;
      if (onlyModified) {
        const hasAnyDiff = SYSTEM_ROLES.some((r) => {
          const defHas = DEFAULT_ROLE_PERMISSIONS[r].includes(perm.key);
          const draftHas = (draftMap[r] || []).includes(perm.key);
          return defHas !== draftHas;
        });
        if (!hasAnyDiff) return false;
      }
      if (q) {
        const haystack = `${perm.key} ${perm.nameVi} ${perm.nameEn} ${perm.descriptionVi} ${perm.descriptionEn}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, categoryFilter, onlyModified, draftMap]);

  const groupedSections = useMemo(() => {
    return PERMISSION_CATEGORIES.map((cat) => ({
      ...cat,
      items: filteredPermissions.filter((p) => p.category === cat.id),
    })).filter((section) => section.items.length > 0);
  }, [filteredPermissions]);

  const togglePermission = (role: UserRole, key: PermissionKey, lockedForSuperAdmin?: boolean) => {
    if (!canConfigure) return;
    if (role === 'super_admin' && lockedForSuperAdmin) {
      showToast(
        isVi
          ? 'Quyền quản trị cốt lõi của Quản Trị Cao Cấp được bảo vệ để tránh khóa quyền hệ thống.'
          : 'Core Super Admin governance permissions are locked to prevent administrative lockout.',
        'info'
      );
      return;
    }

    setDraftMap((prev) => {
      const currentSet = new Set(prev[role] || []);
      if (currentSet.has(key)) {
        currentSet.delete(key);
      } else {
        currentSet.add(key);
      }
      return {
        ...prev,
        [role]: sanitizeRolePermissionsList(role, Array.from(currentSet)),
      };
    });
  };

  const toggleCategoryForRole = (role: UserRole, categoryId: PermissionCategory) => {
    if (!canConfigure) return;
    const categoryKeys = PERMISSION_CATALOG.filter((p) => p.category === categoryId);
    const toggleable = categoryKeys.filter((p) => !(role === 'super_admin' && p.lockedForSuperAdmin));
    if (toggleable.length === 0) return;

    const currentSet = new Set(draftMap[role] || []);
    const allEnabled = toggleable.every((p) => currentSet.has(p.key));

    toggleable.forEach((p) => {
      if (allEnabled) currentSet.delete(p.key);
      else currentSet.add(p.key);
    });

    setDraftMap((prev) => ({
      ...prev,
      [role]: sanitizeRolePermissionsList(role, Array.from(currentSet)),
    }));
  };

  const handleSaveMatrix = async () => {
    if (!canConfigure || saving) return;
    setSaving(true);
    try {
      const ok = await saveAllRolePermissions(draftMap);
      if (ok) {
        showToast(
          isVi
            ? `Đã lưu và áp dụng chính sách phân quyền 5 vai trò (${dataSourceMode === 'firestore' ? 'Firestore Live' : 'Máy chủ nội bộ'}).`
            : `Saved & enforced RBAC policies across all 5 roles (${dataSourceMode === 'firestore' ? 'Firestore Live' : 'Local Server'}).`,
          'success'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (targetRole?: UserRole) => {
    if (!canConfigure || resetting) return;
    setResetting(true);
    try {
      const ok = await resetRolePermissions(targetRole);
      if (ok) {
        showToast(
          targetRole
            ? isVi
              ? `Đã khôi phục quyền chuẩn cho vai trò ${t.roles[targetRole]}.`
              : `Restored default permissions for ${t.roles[targetRole]}.`
            : isVi
            ? 'Đã khôi phục toàn bộ bảng phân quyền về cấu hình chuẩn mặc định.'
            : 'Restored all 5 role policies to baseline defaults.',
          'success'
        );
      }
    } finally {
      setResetting(false);
    }
  };

  const handleDiscardStaged = () => {
    setDraftMap({ ...rolePermissions });
  };

  const focusedRoleUsers = useMemo(() => {
    if (!focusedRole) return [];
    return users.filter((u) => u.role === focusedRole);
  }, [focusedRole, users]);

  return (
    <div className="space-y-5">
      {/* Header & Storage Status Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="font-semibold text-slate-900">
              {isVi ? 'Chính Sách Kiểm Soát Truy Cập (RBAC)' : 'Role-Based Access Control (RBAC)'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {dataSourceMode === 'firestore'
                ? 'Firestore /rolePermissions'
                : isVi
                ? 'Lưu trữ Máy chủ Nội bộ'
                : 'Express Persisted Policy'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {ALL_PERMISSION_KEYS.length} {isVi ? 'quyền chi tiết' : 'granular capabilities'}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            {isVi
              ? 'Bảng Điều Khiển Phân Quyền Các Vai Trò Người Dùng'
              : 'User Role Permissions Control Panel'}
          </h3>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            {isVi
              ? 'Mọi thay đổi bật/tắt quyền sau khi lưu sẽ lập tức áp dụng lên thanh điều hướng, bảo vệ tuyến đường (Route Guard), phạm vi xem dữ liệu và các nút nghiệp vụ của từng vai trò.'
              : 'Changes saved here immediately enforce module navigation visibility, route guards, data visibility scopes, and action controls for each user role.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!canConfigure && (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{isVi ? 'Chế độ Chỉ Xem' : 'Read-Only View'}</span>
            </div>
          )}

          {canConfigure && (
            <>
              {unsavedChangesCount > 0 && (
                <button
                  type="button"
                  onClick={handleDiscardStaged}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isVi ? `Hủy (${unsavedChangesCount})` : `Discard (${unsavedChangesCount})`}
                </button>
              )}

              <button
                type="button"
                disabled={resetting || (baselineDeviationCount === 0 && unsavedChangesCount === 0)}
                onClick={() => handleReset(undefined)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-45 whitespace-nowrap shrink-0"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span>{isVi ? 'Khôi phục mặc định' : 'Reset Defaults'}</span>
              </button>

              <button
                type="button"
                disabled={saving || unsavedChangesCount === 0}
                onClick={handleSaveMatrix}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  unsavedChangesCount > 0
                    ? 'bg-[#0A192F] hover:bg-slate-800 text-amber-400 shadow-xs'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {saving
                    ? isVi
                      ? 'Đang lưu...'
                      : 'Saving...'
                    : unsavedChangesCount > 0
                    ? isVi
                      ? `Lưu & Áp Dụng (${unsavedChangesCount})`
                      : `Save & Apply (${unsavedChangesCount})`
                    : isVi
                    ? 'Đã Đồng Bộ'
                    : 'Policy Synced'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5 Role Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {SYSTEM_ROLES.map((role) => {
          const meta = ROLE_META[role];
          const grantedList = draftMap[role] || [];
          const count = grantedList.length;
          const pct = Math.round((count / ALL_PERMISSION_KEYS.length) * 100);
          const memberCount = users.filter((u) => u.role === role).length;
          const isFocused = focusedRole === role;
          const isCurrentActorRole = currentUser.role === role;
          const lastMeta = rolePermissionMeta[role];

          return (
            <button
              key={role}
              type="button"
              onClick={() => setFocusedRole((prev) => (prev === role ? null : role))}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                isFocused
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-mono text-[11px] font-bold ${
                    isFocused ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  {meta.code} · {isCurrentActorRole ? (isVi ? 'Vai trò của bạn' : 'Your role') : role}
                </span>
                <span
                  className={`text-[11px] font-mono tabular-nums font-bold ${
                    isFocused ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {memberCount} {isVi ? 'nhân sự' : 'users'}
                </span>
              </div>

              <div className="mt-1.5 font-bold text-sm truncate">
                {isVi ? meta.shortVi : meta.shortEn}
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold font-mono tabular-nums">
                  {count}
                  <span className={`text-xs font-normal ${isFocused ? 'text-slate-400' : 'text-slate-500'}`}>
                    /{ALL_PERMISSION_KEYS.length}
                  </span>
                </span>
                <span
                  className={`text-xs font-mono tabular-nums font-semibold ${
                    isFocused ? 'text-amber-400' : 'text-slate-700'
                  }`}
                >
                  {pct}%
                </span>
              </div>

              <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${isFocused ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <div
                  className={`h-full rounded-full transition-all ${
                    isFocused ? 'bg-amber-400' : 'bg-[#0A192F]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {lastMeta?.updatedAt && (
                <div className={`mt-2 text-[10px] truncate ${isFocused ? 'text-slate-400' : 'text-slate-400'}`}>
                  {isVi ? 'Cập nhật: ' : 'Updated: '}
                  {lastMeta.updatedAt.slice(0, 10)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Focused Role Context Strip */}
      {focusedRole && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-bold text-slate-900">{t.roles[focusedRole]}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {focusedRoleUsers.length} {isVi ? 'tài khoản đang nắm vai trò này' : 'assigned accounts'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {isVi ? ROLE_META[focusedRole].scopeSummaryVi : ROLE_META[focusedRole].scopeSummaryEn}
            </p>
            {focusedRoleUsers.length > 0 && (
              <p className="text-[11px] text-slate-500">
                {isVi ? 'Nhân sự: ' : 'Members: '}
                {focusedRoleUsers
                  .slice(0, 6)
                  .map((u) => u.name)
                  .join(' · ')}
                {focusedRoleUsers.length > 6 ? ` (+${focusedRoleUsers.length - 6})` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canConfigure && (
              <button
                type="button"
                disabled={resetting}
                onClick={() => handleReset(focusedRole)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isVi ? 'Đặt lại vai trò này' : 'Reset This Role'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFocusedRole(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              {isVi ? 'Bỏ chọn' : 'Clear Focus'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar + Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isVi
                  ? 'Tìm theo tên quyền, mô tả hoặc mã key...'
                  : 'Search permissions by name, description, or key...'
              }
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  categoryFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isVi ? 'Tất cả nhóm' : 'All Groups'}
              </button>
              {PERMISSION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    categoryFilter === cat.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isVi ? cat.labelVi : cat.labelEn}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setOnlyModified((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                onlyModified
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {isVi ? 'Khác mặc định' : 'Modified Only'} ({baselineDeviationCount})
              </span>
            </button>
          </div>
        </div>

        {/* Permission Matrix Table */}
        {groupedSections.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              {isVi
                ? 'Không tìm thấy quyền nào khớp bộ lọc hiện tại.'
                : 'No permissions match the current filter.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setOnlyModified(false);
              }}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {isVi ? 'Xóa bộ lọc' : 'Clear Filters'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 text-left font-bold min-w-[300px]">
                    {isVi ? 'Quyền Hạn & Chức Năng Hệ Thống' : 'Capability & System Feature'}
                  </th>
                  {SYSTEM_ROLES.map((role) => {
                    const meta = ROLE_META[role];
                    const isFocused = focusedRole === role;
                    return (
                      <th
                        key={role}
                        className={`py-3 px-3 text-center font-bold min-w-[120px] transition-colors ${
                          isFocused ? 'bg-amber-50/70 text-slate-900' : ''
                        }`}
                      >
                        <div className="font-bold text-slate-900 whitespace-nowrap">
                          {isVi ? meta.shortVi : meta.shortEn}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal mt-0.5">
                          {(draftMap[role] || []).length}/{ALL_PERMISSION_KEYS.length}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groupedSections.map((section) => (
                  <React.Fragment key={section.id}>
                    {/* Category Group Header Row */}
                    <tr className="bg-slate-100/80 border-y border-slate-200">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {isVi ? section.labelVi : section.labelEn}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isVi ? section.descVi : section.descEn}
                        </div>
                      </td>
                      {SYSTEM_ROLES.map((role) => {
                        const toggleable = section.items.filter(
                          (p) => !(role === 'super_admin' && p.lockedForSuperAdmin)
                        );
                        const allOn =
                          toggleable.length > 0 &&
                          toggleable.every((p) => (draftMap[role] || []).includes(p.key));
                        return (
                          <td key={`${section.id}_${role}`} className="py-2 px-3 text-center">
                            {canConfigure && toggleable.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleCategoryForRole(role, section.id)}
                                className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[10px] font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
                              >
                                {allOn
                                  ? isVi
                                    ? 'Bỏ nhóm'
                                    : 'Uncheck all'
                                  : isVi
                                  ? 'Chọn nhóm'
                                  : 'Check all'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Permission Rows */}
                    {section.items.map((perm) => (
                      <tr
                        key={perm.key}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900">
                              {isVi ? perm.nameVi : perm.nameEn}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="font-mono text-[10px] text-slate-400">{perm.key}</span>
                            {perm.riskTier === 'critical' && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700">
                                  <ShieldAlert className="w-3 h-3" />
                                  {isVi ? 'Trọng yếu' : 'Critical'}
                                </span>
                              </>
                            )}
                            {perm.riskTier === 'elevated' && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                                  <ShieldCheck className="w-3 h-3" />
                                  {isVi ? 'Quản lý' : 'Elevated'}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {isVi ? perm.descriptionVi : perm.descriptionEn}
                          </p>
                        </td>

                        {SYSTEM_ROLES.map((role) => {
                          const enabled = (draftMap[role] || []).includes(perm.key);
                          const savedEnabled = (rolePermissions[role] || []).includes(perm.key);
                          const defaultEnabled = DEFAULT_ROLE_PERMISSIONS[role].includes(perm.key);
                          const isUnsaved = enabled !== savedEnabled;
                          const isCustom = enabled !== defaultEnabled;
                          const isLocked = role === 'super_admin' && Boolean(perm.lockedForSuperAdmin);
                          const isFocused = focusedRole === role;

                          return (
                            <td
                              key={`${perm.key}_${role}`}
                              className={`py-3 px-3 text-center align-middle transition-colors ${
                                isUnsaved
                                  ? 'bg-amber-50'
                                  : isFocused
                                  ? 'bg-amber-50/40'
                                  : ''
                              }`}
                            >
                              <div className="inline-flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={enabled}
                                  aria-label={`${t.roles[role]}: ${isVi ? perm.nameVi : perm.nameEn}`}
                                  disabled={!canConfigure || isLocked}
                                  onClick={() => togglePermission(role, perm.key, perm.lockedForSuperAdmin)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                                    isLocked
                                      ? 'bg-emerald-700/80 cursor-not-allowed'
                                      : !canConfigure
                                      ? enabled
                                        ? 'bg-emerald-600/60 cursor-not-allowed'
                                        : 'bg-slate-200 cursor-not-allowed'
                                      : enabled
                                      ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                                      : 'bg-slate-200 hover:bg-slate-300 cursor-pointer'
                                  }`}
                                >
                                  <span
                                    className={`inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white shadow-xs transition-transform ${
                                      enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  >
                                    {isLocked ? (
                                      <Lock className="w-2.5 h-2.5 text-emerald-700" />
                                    ) : enabled ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-700" />
                                    ) : null}
                                  </span>
                                </button>
                                {(isUnsaved || isCustom) && (
                                  <span
                                    className={`text-[9px] font-semibold ${
                                      isUnsaved ? 'text-amber-700' : 'text-slate-500'
                                    }`}
                                  >
                                    {isUnsaved
                                      ? isVi
                                        ? 'Chờ lưu'
                                        : 'Pending'
                                      : isVi
                                      ? 'Tùy chỉnh'
                                      : 'Custom'}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Sync Info */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              {dataSourceMode === 'firestore'
                ? isVi
                  ? 'Chế độ Chính thức (Live): Bảng phân quyền được lưu trực tiếp vào collection /rolePermissions trên Firebase Firestore.'
                  : 'Official Live Mode: Role policies persist directly to Firestore /rolePermissions.'
                : isVi
                ? 'Chế độ Sandbox: Bảng phân quyền được lưu cục bộ trên máy chủ Express (.data/academy-db.json).'
                : 'Demo Sandbox Mode: Role policies persist locally via Express REST API.'}
            </span>
          </div>
          <span className="font-mono tabular-nums text-slate-500">
            {filteredPermissions.length}/{ALL_PERMISSION_KEYS.length} {isVi ? 'quyền hiển thị' : 'visible'}
          </span>
        </div>
      </div>
    </div>
  );
};
