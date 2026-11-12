import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import {
  Settings,
  Users,
  Shield,
  Building,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';

export const AdminManagementView: React.FC = () => {
  const { users, currentUser, language, t } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'properties' | 'system'>('users');

  const auditLogs = [
    {
      id: 'log_1',
      action: 'APPROVE_ASSESSMENT',
      actor: 'David Tran (Cluster FC)',
      target: 'Nguyễn Minh Thư (Senior Accountant)',
      timestamp: '2026-03-18 14:32:00',
      details: 'Phê duyệt đánh giá năng lực Q1/2026 và kích hoạt IDP',
    },
    {
      id: 'log_2',
      action: 'ISSUE_CERTIFICATE',
      actor: 'Elena Rostova (Corporate Director)',
      target: 'Lê Hoàng Nam (AFC)',
      timestamp: '2025-11-20 09:15:22',
      details: 'Cấp chứng chỉ Level 3 - Assistant Financial Controller Ready (FCA-CERT-2025-089)',
    },
    {
      id: 'log_3',
      action: 'OJT_GRADE',
      actor: 'David Tran (Cluster FC)',
      target: 'Nguyễn Minh Thư (Senior Accountant)',
      timestamp: '2024-03-15 16:45:10',
      details: 'Chấm điểm dự án OJT-FAR-01: Điểm 90/100 (Đạt)',
    },
  ];

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
          Super Admin Mode Active
        </span>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeAdminTab === 'users'
              ? 'bg-[#0A192F] text-amber-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {language === 'vi' ? 'Quản Lý Người Dùng & Phân Quyền' : 'Users & Roles (RBAC)'}
        </button>
        <button
          onClick={() => setActiveAdminTab('properties')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeAdminTab === 'properties'
              ? 'bg-[#0A192F] text-amber-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {language === 'vi' ? 'Khách Sạn & Đơn Vị Thành Viên' : 'Properties & Locations'}
        </button>
        <button
          onClick={() => setActiveAdminTab('system')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
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
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              Danh Sách Nhân Sự & Phân Quyền Hệ Thống ({users.length})
            </h3>
            <button
              onClick={() => alert('Thêm người dùng mới')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'vi' ? 'Tạo tài khoản mới' : 'Add User'}</span>
            </button>
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
          {[
            {
              name: 'Grand Horizon Saigon Hotel & Residences',
              keys: '350 phòng + 120 căn hộ dịch vụ cao cấp',
              gm: 'Richard Vance',
              fc: 'David Tran',
              learners: 4,
              brand: 'Luxury Collection Benchmark',
            },
            {
              name: 'Royal Palm Resort & Spa Danang',
              keys: '450 phòng & Biệt thự biển 5 sao',
              gm: 'Helena Berg',
              fc: 'Sarah Jenkins',
              learners: 3,
              brand: 'Resort & Lifestyle Benchmark',
            },
            {
              name: 'Marina Bay Heritage Hotel Hanoi',
              keys: '280 phòng di sản tại trung tâm phố cổ',
              gm: 'Thomas Laurent',
              fc: 'David Tran (Cluster)',
              learners: 2,
              brand: 'Boutique Heritage Benchmark',
            },
            {
              name: 'Emerald Bay Luxury Suites Nha Trang',
              keys: '310 căn hộ nghỉ dưỡng biển',
              gm: 'Arthur Pendelton',
              fc: 'Sarah Jenkins (Cluster)',
              learners: 2,
              brand: 'Extended Stay Luxury',
            },
          ].map((p, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {p.brand}
                </span>
                <span className="text-xs font-bold text-slate-600">{p.learners} học viên</span>
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">{p.name}</h4>
              <p className="text-xs text-slate-500">{p.keys}</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span>GM: <strong>{p.gm}</strong></span>
                <span>FC: <strong>{p.fc}</strong></span>
              </div>
            </div>
          ))}
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
                <p className="font-bold text-slate-900 mt-1">Google Gemini 3.8 Flash</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Secure Express Proxy (/api/gemini/*)</p>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[10px] text-blue-700 font-bold block uppercase">Data Store Engine</span>
                <p className="font-bold text-slate-900 mt-1">Full-Stack State & Persistence</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Dual Mode: Reactive Store & Firebase Ready</p>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-[10px] text-purple-700 font-bold block uppercase">Security & RBAC</span>
                <p className="font-bold text-slate-900 mt-1">Role-Based Access Control</p>
                <p className="text-[10px] text-slate-500 mt-0.5">5 Granular Roles & Audit Trail</p>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Nhật Ký Kiểm Toán Vận Hành (System Audit Trail)
            </h4>
            <div className="space-y-2 text-xs">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
