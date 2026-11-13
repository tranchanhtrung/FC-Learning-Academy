import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole, ProficiencyLevel } from '../../types';
import {
  Settings,
  Database,
  Plus,
  Edit2,
  X,
} from 'lucide-react';

const PROPERTIES_META = [
  {
    name: 'Grand Horizon Saigon Hotel & Residences',
    keys: '350 phòng + 120 căn hộ dịch vụ cao cấp',
    gm: 'Richard Vance',
    fc: 'David Tran',
    brand: 'Luxury Collection Benchmark',
  },
  {
    name: 'Royal Palm Resort & Spa Danang',
    keys: '450 phòng & Biệt thự biển 5 sao',
    gm: 'Helena Berg',
    fc: 'Sarah Jenkins',
    brand: 'Resort & Lifestyle Benchmark',
  },
  {
    name: 'Marina Bay Heritage Hotel Hanoi',
    keys: '280 phòng di sản tại trung tâm phố cổ',
    gm: 'Thomas Laurent',
    fc: 'David Tran (Cluster)',
    brand: 'Boutique Heritage Benchmark',
  },
  {
    name: 'Emerald Bay Luxury Suites Nha Trang',
    keys: '310 căn hộ nghỉ dưỡng biển',
    gm: 'Arthur Pendelton',
    fc: 'Sarah Jenkins (Cluster)',
    brand: 'Extended Stay Luxury',
  },
];

export const AdminManagementView: React.FC = () => {
  const { users, currentUser, auditLogs, addUser, updateUser, showToast, language, t } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'properties' | 'system'>('users');
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
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

  const isSuperAdmin = currentUser.role === 'super_admin';

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
      showToast(language === 'vi' ? 'Vui lòng nhập họ tên và email.' : 'Name and email are required.', 'error');
      return;
    }

    if (editingUserId) {
      const updated = await updateUser(editingUserId, userForm);
      if (updated) {
        showToast(
          language === 'vi' ? `Đã cập nhật thông tin ${updated.name}.` : `Updated user ${updated.name}.`,
          'success'
        );
        setUserModalOpen(false);
      }
    } else {
      const created = await addUser(userForm);
      if (created) {
        showToast(
          language === 'vi' ? `Đã tạo tài khoản ${created.name}.` : `Created user ${created.name}.`,
          'success'
        );
        setUserModalOpen(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Enterprise System Governance</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.nav.administration}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {language === 'vi'
              ? 'Quản trị người dùng, phân quyền vai trò (RBAC), danh mục khách sạn thành viên và cấu hình kết nối đám mây.'
              : 'User management, role-based access control (RBAC), property organizations, and cloud integration health.'}
          </p>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
          {t.roles[currentUser.role]}
        </span>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'users'
              ? 'bg-[#0A192F] text-amber-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {language === 'vi' ? 'Quản Lý Người Dùng & Phân Quyền' : 'Users & Roles (RBAC)'}
        </button>
        <button
          onClick={() => setActiveAdminTab('properties')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'properties'
              ? 'bg-[#0A192F] text-amber-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {language === 'vi' ? 'Khách Sạn & Đơn Vị Thành Viên' : 'Properties & Locations'}
        </button>
        <button
          onClick={() => setActiveAdminTab('system')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'system'
              ? 'bg-[#0A192F] text-amber-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {language === 'vi' ? 'Kiến Trúc & Nhật Ký Kiểm Toán' : 'Architecture & Audit Logs'}
        </button>
      </div>

      {/* Users Tab */}
      {activeAdminTab === 'users' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-base text-slate-900">
              Danh Sách Nhân Sự & Phân Quyền Hệ Thống ({users.length})
            </h3>
            {isSuperAdmin && (
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'vi' ? 'Tạo tài khoản mới' : 'Add User'}</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Họ và tên</th>
                  <th className="py-2.5 px-3">Vai trò hệ thống</th>
                  <th className="py-2.5 px-3">Chức vụ chuyên môn</th>
                  <th className="py-2.5 px-3">Đơn vị công tác</th>
                  <th className="py-2.5 px-3 text-center">Cấp độ</th>
                  {isSuperAdmin && <th className="py-2.5 px-3 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2.5">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <span>{u.name}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {t.roles[u.role]}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{u.position}</td>
                    <td className="py-3 px-3 text-slate-500 truncate max-w-[200px]">{u.property}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                      Level {u.currentLevel} / {u.targetLevel}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{language === 'vi' ? 'Sửa' : 'Edit'}</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Properties Tab */}
      {activeAdminTab === 'properties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROPERTIES_META.map((p, idx) => {
            const learnerCount = users.filter(
              (u) => u.role === 'learner' && u.property === p.name
            ).length;
            return (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    {p.brand}
                  </span>
                  <span className="text-xs font-bold text-slate-600">{learnerCount} học viên</span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">{p.name}</h4>
                <p className="text-xs text-slate-500">{p.keys}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span>GM: <strong>{p.gm}</strong></span>
                  <span>FC: <strong>{p.fc}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Architecture & Audit Logs Tab */}
      {activeAdminTab === 'system' && (
        <div className="space-y-6">
          {/* Architecture Status Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Kiến Trúc Kỹ Thuật & Cấu Hình Dịch Vụ Đám Mây</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold block uppercase">AI Model Server</span>
                <p className="font-bold text-slate-900 mt-1">Google Gemini 4 Hydrogen</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Server-Side Curriculum Proxy (/api/gemini/*)</p>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[10px] text-blue-700 font-bold block uppercase">Data Store Engine</span>
                <p className="font-bold text-slate-900 mt-1">Full-Stack State & Disk Persistence</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Express REST + Local JSON Store (.data/academy-db.json)</p>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-[10px] text-purple-700 font-bold block uppercase">Security & RBAC</span>
                <p className="font-bold text-slate-900 mt-1">Role-Based Access Control</p>
                <p className="text-[10px] text-slate-500 mt-0.5">5 Granular Roles & Live Server Audit Trail</p>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Nhật Ký Kiểm Toán Vận Hành ({auditLogs.length})
            </h4>
            <div className="space-y-2 text-xs max-h-[420px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-slate-400 italic py-4 text-center">
                  {language === 'vi' ? 'Chưa có nhật ký kiểm toán nào.' : 'No audit log entries recorded.'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSaveUser}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingUserId
                  ? language === 'vi' ? 'Cập Nhật Tài Khoản Nhân Sự' : 'Edit User Account'
                  : language === 'vi' ? 'Tạo Tài Khoản Nhân Sự Mới' : 'Create New User Account'}
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
                <label className="font-bold text-slate-700 block mb-1">Họ và tên</label>
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
                <label className="font-bold text-slate-700 block mb-1">Vai trò (RBAC Role)</label>
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
                <label className="font-bold text-slate-700 block mb-1">Chức vụ chuyên môn</label>
                <input
                  type="text"
                  value={userForm.position}
                  onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Khách sạn / Đơn vị</label>
              <select
                value={userForm.property}
                onChange={(e) => setUserForm({ ...userForm, property: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {PROPERTIES_META.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
                <option value="Cluster Corporate Finance Office">Cluster Corporate Finance Office</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cấp độ hiện tại</label>
                <select
                  value={userForm.currentLevel}
                  onChange={(e) =>
                    setUserForm({ ...userForm, currentLevel: Number(e.target.value) as ProficiencyLevel })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>Level {l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cấp độ mục tiêu</label>
                <select
                  value={userForm.targetLevel}
                  onChange={(e) =>
                    setUserForm({ ...userForm, targetLevel: Number(e.target.value) as ProficiencyLevel })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>Level {l}</option>
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
    </div>
  );
};

