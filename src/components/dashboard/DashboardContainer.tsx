import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LearnerDashboard } from './LearnerDashboard';
import { FCDashboard } from './FCDashboard';
import { GMDashboard } from './GMDashboard';
import { AdminDashboard } from './AdminDashboard';
import { UserCheck, Briefcase, Crown, Shield, Eye } from 'lucide-react';
import { UserRole } from '../../types';

export const DashboardContainer: React.FC = () => {
  const { currentUser, language } = useApp();

  // Allow switching view tab independently of active role
  const [activeViewRole, setActiveViewRole] = useState<UserRole>(currentUser.role);

  // Sync if currentUser changes role
  React.useEffect(() => {
    setActiveViewRole(currentUser.role);
  }, [currentUser.role]);

  const viewOptions: { role: UserRole; labelVi: string; labelEn: string; icon: any }[] = [
    {
      role: 'learner',
      labelVi: 'Học Viên / Kế Toán Viên',
      labelEn: 'Learner / Accountant',
      icon: UserCheck,
    },
    {
      role: 'financial_controller',
      labelVi: 'Giám Đốc Tài Chính (FC)',
      labelEn: 'Financial Controller (FC)',
      icon: Briefcase,
    },
    {
      role: 'general_manager',
      labelVi: 'Tổng Giám Đốc (GM)',
      labelEn: 'General Manager (GM)',
      icon: Crown,
    },
    {
      role: 'super_admin',
      labelVi: 'Quản Trị Viên / L&D',
      labelEn: 'Super Admin / L&D',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Perspective Quick Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
          <Eye className="w-4 h-4 text-amber-500" />
          <span>{language === 'vi' ? 'Xem Dashboard theo vai trò:' : 'View Dashboard Perspective:'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {viewOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = activeViewRole === opt.role;
            return (
              <button
                key={opt.role}
                onClick={() => setActiveViewRole(opt.role)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0A192F] text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{language === 'vi' ? opt.labelVi : opt.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render selected dashboard */}
      {activeViewRole === 'learner' && <LearnerDashboard />}
      {activeViewRole === 'financial_controller' && <FCDashboard />}
      {activeViewRole === 'general_manager' && <GMDashboard />}
      {(activeViewRole === 'super_admin' || activeViewRole === 'lnd_manager') && <AdminDashboard />}
    </div>
  );
};
