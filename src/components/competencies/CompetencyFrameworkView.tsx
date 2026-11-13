import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Competency, CompetencyDomain } from '../../types';
import {
  Search,
  Filter,
  Plus,
  Download,
  BookOpen,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Users,
  Crown,
  ChevronRight,
  X,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const CompetencyFrameworkView: React.FC = () => {
  const {
    domains,
    competencies,
    saveCompetency,
    deleteCompetency,
    courses,
    language,
    t,
    currentUser,
    setSelectedCourseForPlayer,
    showToast,
  } = useApp();

  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<Competency>>({});

  const isAdminOrManager =
    currentUser.role === 'super_admin' || currentUser.role === 'lnd_manager';

  const domainIcons: Record<string, any> = {
    dom_1: BookOpen,
    dom_2: ShieldCheck,
    dom_3: TrendingUp,
    dom_4: BarChart3,
    dom_5: Users,
    dom_6: Crown,
  };

  const filteredCompetencies = competencies.filter((c) => {
    const matchesDomain = selectedDomainId === 'all' || c.domainId === selectedDomainId;
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.definitionVi.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = [
      'Code',
      'Domain',
      'Name Vi',
      'Name En',
      'Level 1 Criteria',
      'Level 2 Criteria',
      'Level 3 Criteria',
      'Level 4 Criteria',
    ];
    const rows = competencies.map((c) => [
      `"${c.code}"`,
      `"${c.domainId}"`,
      `"${c.nameVi}"`,
      `"${c.nameEn}"`,
      `"${c.assessmentCriteria.level1}"`,
      `"${c.assessmentCriteria.level2}"`,
      `"${c.assessmentCriteria.level3}"`,
      `"${c.assessmentCriteria.level4}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FC_Competency_Framework_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAddModal = () => {
    setEditForm({
      id: `comp_custom_${Date.now()}`,
      code: `FC-${Math.floor(10 + Math.random() * 89)}`,
      domainId: 'dom_1',
      nameVi: '',
      nameEn: '',
      definitionVi: '',
      definitionEn: '',
      expectedLevelByPosition: {
        'Junior Staff Accountant': 1,
        'Senior Accountant': 2,
        'Assistant Financial Controller': 3,
        'Financial Controller': 4,
      },
      assessmentCriteria: {
        level1: '',
        level2: '',
        level3: '',
        level4: '',
      },
      evidenceRequirements: [],
      associatedCourseIds: ['course_01'],
    });
    setIsEditing(true);
  };

  const handleOpenEditModal = (comp: Competency) => {
    setEditForm({
      ...comp,
      assessmentCriteria: { ...comp.assessmentCriteria },
      expectedLevelByPosition: { ...comp.expectedLevelByPosition },
      evidenceRequirements: [...comp.evidenceRequirements],
      associatedCourseIds: [...comp.associatedCourseIds],
    });
    setSelectedCompetency(null);
    setIsEditing(true);
  };

  const handleDeleteCompetency = async (comp: Competency) => {
    await deleteCompetency(comp.id);
    if (selectedCompetency?.id === comp.id) {
      setSelectedCompetency(null);
    }
    showToast(
      language === 'vi'
        ? `Đã xóa năng lực ${comp.code} khỏi khung chuẩn.`
        : `Deleted competency ${comp.code}.`,
      'info'
    );
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nameVi || !editForm.code) {
      showToast(language === 'vi' ? 'Vui lòng nhập đầy đủ mã và tên năng lực.' : 'Code and name are required.', 'error');
      return;
    }
    const payload: Competency = {
      ...(editForm as Competency),
      nameEn: editForm.nameEn?.trim() || editForm.nameVi,
      definitionEn: editForm.definitionEn?.trim() || editForm.definitionVi || '',
      assessmentCriteria: {
        level1: editForm.assessmentCriteria?.level1 || 'Understands basic principles under supervision.',
        level2: editForm.assessmentCriteria?.level2 || 'Executes routine operations independently.',
        level3: editForm.assessmentCriteria?.level3 || 'Analyzes variances and leads departmental reviews.',
        level4: editForm.assessmentCriteria?.level4 || 'Acts as strategic business partner to the GM.',
      },
    };
    await saveCompetency(payload);
    setIsEditing(false);
    showToast(
      language === 'vi'
        ? `Đã lưu năng lực ${payload.code} thành công.`
        : `Competency ${payload.code} saved successfully.`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>USALI & 5-Star International Hospitality Framework</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.competency.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {t.competency.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.competency.exportFramework}</span>
          </button>

          {isAdminOrManager && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.competency.addNew}</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Domains Grid Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {domains.map((dom) => {
          const Icon = domainIcons[dom.id] || BookOpen;
          const isSelected = selectedDomainId === dom.id;
          const count = competencies.filter((c) => c.domainId === dom.id).length;

          return (
            <button
              key={dom.id}
              onClick={() => setSelectedDomainId(isSelected ? 'all' : dom.id)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#0A192F] text-white border-amber-400 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-white hover:border-slate-300 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {dom.code}
                </span>
                <span className={`text-[11px] font-bold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                  {count} comps
                </span>
              </div>
              <div>
                <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-amber-400' : 'text-blue-600'}`} />
                <h4 className="text-xs font-bold leading-snug line-clamp-2">
                  {language === 'vi' ? dom.nameVi : dom.nameEn}
                </h4>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.common.search}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-500">
          <span>{filteredCompetencies.length} {language === 'vi' ? 'năng lực phù hợp' : 'competencies matching'}</span>
          {selectedDomainId !== 'all' && (
            <button
              onClick={() => setSelectedDomainId('all')}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              {language === 'vi' ? 'Xóa lọc' : 'Clear Filter'}
            </button>
          )}
        </div>
      </div>

      {/* Competencies Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompetencies.map((comp) => {
          const dom = domains.find((d) => d.id === comp.domainId);
          return (
            <div
              key={comp.id}
              onClick={() => setSelectedCompetency(comp)}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-amber-400/80 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    {comp.code}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                    {language === 'vi' ? dom?.nameVi : dom?.nameEn}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                  {language === 'vi' ? comp.nameVi : comp.nameEn}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {language === 'vi' ? comp.definitionVi : comp.definitionEn}
                </p>
              </div>

              {/* Bottom level ladder pills */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((lvl) => (
                    <span
                      key={lvl}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {lvl}
                    </span>
                  ))}
                </div>
                <span className="text-amber-600 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>{t.common.viewDetails}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Competency Detail Modal */}
      {selectedCompetency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 font-mono">
                  {selectedCompetency.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {language === 'vi' ? selectedCompetency.nameVi : selectedCompetency.nameEn}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCompetency(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Definition */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === 'vi' ? 'Định nghĩa năng lực' : 'Competency Definition'}
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {language === 'vi' ? selectedCompetency.definitionVi : selectedCompetency.definitionEn}
              </p>
            </div>

            {/* 4-Level Rubric */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === 'vi' ? 'Thang tiêu chí đánh giá 4 cấp độ (Assessment Rubric)' : '4-Level Rubric Criteria'}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <span className="font-bold text-slate-800 block text-[11px] text-blue-700 mb-0.5">
                    Level 1 – Foundation (Nền tảng):
                  </span>
                  <p className="text-slate-600">{selectedCompetency.assessmentCriteria.level1}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <span className="font-bold text-slate-800 block text-[11px] text-emerald-700 mb-0.5">
                    Level 2 – Operational (Vận hành độc lập):
                  </span>
                  <p className="text-slate-600">{selectedCompetency.assessmentCriteria.level2}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <span className="font-bold text-slate-800 block text-[11px] text-purple-700 mb-0.5">
                    Level 3 – Advanced (Nâng cao & Giải quyết vấn đề):
                  </span>
                  <p className="text-slate-600">{selectedCompetency.assessmentCriteria.level3}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50">
                  <span className="font-bold text-amber-900 block text-[11px] mb-0.5">
                    Level 4 – Strategic (Chiến lược & Tham mưu cho GM):
                  </span>
                  <p className="text-slate-700 font-medium">{selectedCompetency.assessmentCriteria.level4}</p>
                </div>
              </div>
            </div>

            {/* Evidence Requirements */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === 'vi' ? 'Bằng chứng thực tế yêu cầu (Evidence Required)' : 'Evidence Requirements'}
              </h4>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                {selectedCompetency.evidenceRequirements.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>

            {/* Linked Courses */}
            {selectedCompetency.associatedCourseIds.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'vi' ? 'Khóa học đào tạo liên kết' : 'Associated Courses'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCompetency.associatedCourseIds.map((cid) => {
                    const c = courses.find((course) => course.id === cid);
                    if (!c) return null;
                    return (
                      <button
                        key={cid}
                        onClick={() => {
                          setSelectedCompetency(null);
                          setSelectedCourseForPlayer(c);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{c.code} – {language === 'vi' ? c.titleVi : c.titleEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              {isAdminOrManager ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(selectedCompetency)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{language === 'vi' ? 'Chỉnh sửa' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCompetency(selectedCompetency)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'vi' ? 'Xóa' : 'Delete'}</span>
                  </button>
                </div>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedCompetency(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Competency Modal (Admin) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSaveForm}
            className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-slate-200 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {language === 'vi' ? 'Thêm / Cập Nhật Năng Lực' : 'Add / Update Competency'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã năng lực (Code)</label>
                <input
                  type="text"
                  required
                  value={editForm.code || ''}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Miền năng lực</label>
                <select
                  value={editForm.domainId || 'dom_1'}
                  onChange={(e) => setEditForm({ ...editForm, domainId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} - {d.nameVi}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên năng lực (Tiếng Việt)</label>
                <input
                  type="text"
                  required
                  value={editForm.nameVi || ''}
                  onChange={(e) => setEditForm({ ...editForm, nameVi: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Competency Name (English)</label>
                <input
                  type="text"
                  value={editForm.nameEn || ''}
                  onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                  placeholder="Optional English title"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Định nghĩa chi tiết (Tiếng Việt)</label>
                <textarea
                  rows={2}
                  value={editForm.definitionVi || ''}
                  onChange={(e) => setEditForm({ ...editForm, definitionVi: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Definition (English)</label>
                <textarea
                  rows={2}
                  value={editForm.definitionEn || ''}
                  onChange={(e) => setEditForm({ ...editForm, definitionEn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <label className="font-bold text-slate-700 block">
                {language === 'vi' ? 'Tiêu chí Rubric 4 cấp độ (L1 – L4)' : '4-Level Rubric Criteria (L1 – L4)'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Level 1 (Foundation) criteria..."
                  value={editForm.assessmentCriteria?.level1 || ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      assessmentCriteria: {
                        level1: e.target.value,
                        level2: editForm.assessmentCriteria?.level2 || '',
                        level3: editForm.assessmentCriteria?.level3 || '',
                        level4: editForm.assessmentCriteria?.level4 || '',
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Level 2 (Operational) criteria..."
                  value={editForm.assessmentCriteria?.level2 || ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      assessmentCriteria: {
                        level1: editForm.assessmentCriteria?.level1 || '',
                        level2: e.target.value,
                        level3: editForm.assessmentCriteria?.level3 || '',
                        level4: editForm.assessmentCriteria?.level4 || '',
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Level 3 (Advanced) criteria..."
                  value={editForm.assessmentCriteria?.level3 || ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      assessmentCriteria: {
                        level1: editForm.assessmentCriteria?.level1 || '',
                        level2: editForm.assessmentCriteria?.level2 || '',
                        level3: e.target.value,
                        level4: editForm.assessmentCriteria?.level4 || '',
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Level 4 (Strategic FC) criteria..."
                  value={editForm.assessmentCriteria?.level4 || ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      assessmentCriteria: {
                        level1: editForm.assessmentCriteria?.level1 || '',
                        level2: editForm.assessmentCriteria?.level2 || '',
                        level3: editForm.assessmentCriteria?.level3 || '',
                        level4: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded-xl cursor-pointer"
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
