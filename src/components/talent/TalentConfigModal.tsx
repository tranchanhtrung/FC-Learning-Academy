import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { isCompetencyCritical } from '../../lib/talentEngine';
import { CompetencyConfigOverride, TalentConfigDoc } from '../../types';
import { X, Save, ShieldCheck, Sliders, AlertTriangle } from 'lucide-react';

interface TalentConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export const TalentConfigModal: React.FC<TalentConfigModalProps> = ({ open, onClose }) => {
  const { talentConfig, updateTalentConfig, competencies, language, currentUser } = useApp();
  const [draft, setDraft] = useState<TalentConfigDoc>(talentConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(JSON.parse(JSON.stringify(talentConfig)));
    }
  }, [open, talentConfig]);

  if (!open) return null;

  const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'lnd_manager';
  const ratioSum =
    Number(draft.ratio702010.experiential) +
    Number(draft.ratio702010.social) +
    Number(draft.ratio702010.formal);

  const toggleCritical = (code: string, compIndex: number) => {
    const comp = competencies[compIndex];
    const currentCrit =
      draft.competencyOverrides[code]?.isCritical ?? isCompetencyCritical(comp, talentConfig);
    const existing = draft.competencyOverrides[code] || {
      competencyCode: code,
      weightPercent: 1,
      isCritical: currentCrit,
    };
    setDraft((prev) => ({
      ...prev,
      competencyOverrides: {
        ...prev.competencyOverrides,
        [code]: {
          ...existing,
          isCritical: !currentCrit,
        },
      },
    }));
  };

  const setWeight = (code: string, val: number) => {
    const comp = competencies.find((c) => c.code === code);
    const currentCrit = comp
      ? draft.competencyOverrides[code]?.isCritical ?? isCompetencyCritical(comp, talentConfig)
      : false;
    const existing: CompetencyConfigOverride = draft.competencyOverrides[code] || {
      competencyCode: code,
      weightPercent: 1,
      isCritical: currentCrit,
    };
    setDraft((prev) => ({
      ...prev,
      competencyOverrides: {
        ...prev.competencyOverrides,
        [code]: {
          ...existing,
          weightPercent: Math.max(0.5, Math.min(20, val)),
        },
      },
    }));
  };

  const handleSave = async () => {
    if (ratioSum !== 100) return;
    setSaving(true);
    const ok = await updateTalentConfig(draft);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold">
                {language === 'vi'
                  ? 'Cấu hình Competency Gap Engine & Ngưỡng Sẵn Sàng'
                  : 'Competency Gap Engine & Career Readiness Configuration'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'vi'
                  ? 'Thiết lập trọng số, năng lực cốt lõi bắt buộc (Critical), tỷ lệ 70-20-10 & ngưỡng thăng tiến'
                  : 'Configure competency weights, critical minimum gates, 70-20-10 targets & readiness thresholds'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isAuthorized && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {language === 'vi'
                  ? 'Chỉ Super Administrator hoặc L&D Manager mới được thay đổi cấu hình hệ thống.'
                  : 'Only Super Administrator or L&D Manager can persist configuration changes.'}
              </span>
            </div>
          )}

          {/* Weight Mode & 70-20-10 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {language === 'vi' ? 'Phương pháp trọng số năng lực' : 'Competency Weighting Mode'}
              </h3>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    checked={draft.weightMode === 'default_equal'}
                    onChange={() => setDraft((p) => ({ ...p, weightMode: 'default_equal' }))}
                    className="mt-0.5 accent-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {language === 'vi' ? 'Mặc định đồng đều (Equal Weights)' : 'Default Equal Weights'}
                    </span>
                    <span className="text-slate-500">
                      {language === 'vi'
                        ? 'Tất cả năng lực bắt buộc có trọng số bằng nhau (1.0x).'
                        : 'All required competencies are weighted equally across the position matrix.'}
                    </span>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    checked={draft.weightMode === 'custom_weighted'}
                    onChange={() => setDraft((p) => ({ ...p, weightMode: 'custom_weighted' }))}
                    className="mt-0.5 accent-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {language === 'vi' ? 'Trọng số tùy chỉnh (Custom Weighted)' : 'Custom Weighted Scoring'}
                    </span>
                    <span className="text-slate-500">
                      {language === 'vi'
                        ? 'Áp dụng hệ số trọng số riêng cho từng năng lực bên dưới.'
                        : 'Applies per-competency weight multipliers defined below.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {language === 'vi' ? 'Mục tiêu tỷ lệ 70-20-10 (%)' : '70-20-10 Learning Mix Targets (%)'}
                </h3>
                <span
                  className={`text-xs font-mono font-bold tabular-nums ${
                    ratioSum === 100 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  Total: {ratioSum}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">70% OJT / Exp</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.ratio702010.experiential}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        ratio702010: { ...p.ratio702010, experiential: Number(e.target.value) },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">20% Coaching</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.ratio702010.social}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        ratio702010: { ...p.ratio702010, social: Number(e.target.value) },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">10% Formal</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.ratio702010.formal}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        ratio702010: { ...p.ratio702010, formal: Number(e.target.value) },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              {ratioSum !== 100 && (
                <p className="text-[11px] text-rose-600 font-medium">
                  {language === 'vi' ? 'Tổng tỷ lệ phải bằng 100%.' : '70-20-10 ratios must sum to 100%.'}
                </p>
              )}
            </div>
          </div>

          {/* Readiness Thresholds */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>
                  {language === 'vi'
                    ? 'Ngưỡng đánh giá Sẵn sàng Thăng tiến (Career Readiness)'
                    : 'Career Readiness Evaluation Thresholds'}
                </span>
              </h3>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.readinessThresholds.requireAllCriticalAtTarget}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      readinessThresholds: {
                        ...p.readinessThresholds,
                        requireAllCriticalAtTarget: e.target.checked,
                      },
                    }))
                  }
                  className="accent-slate-900"
                />
                <span>
                  {language === 'vi'
                    ? 'Chặn "Ready for Review" nếu còn Critical Competency < Target'
                    : 'Block "Ready for Review" if any Critical Competency < Target'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { key: 'readyForReviewMinAchievement', label: 'Ready Ach %' },
                { key: 'readyForReviewMinIdp', label: 'Ready IDP %' },
                { key: 'readyForReviewMinCritical', label: 'Ready Crit %' },
                { key: 'nearlyReadyMinAchievement', label: 'Nearly Ach %' },
                { key: 'nearlyReadyMinIdp', label: 'Nearly IDP %' },
                { key: 'developingMinAchievement', label: 'Developing %' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-[11px] text-slate-600 block mb-1">{field.label}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={(draft.readinessThresholds as any)[field.key]}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        readinessThresholds: {
                          ...p.readinessThresholds,
                          [field.key]: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Per-Competency Critical Flags & Weights */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {language === 'vi'
                  ? `Danh sách Năng lực Cốt lõi & Trọng số (${competencies.length})`
                  : `Critical Competency Flags & Weights (${competencies.length})`}
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Code</th>
                    <th className="px-3 py-2 font-semibold">Competency</th>
                    <th className="px-3 py-2 font-semibold text-center">Critical Gate</th>
                    <th className="px-3 py-2 font-semibold text-right">Weight (x)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {competencies.map((comp, idx) => {
                    const isCrit =
                      draft.competencyOverrides[comp.code]?.isCritical ??
                      isCompetencyCritical(comp, talentConfig);
                    const weight = draft.competencyOverrides[comp.code]?.weightPercent ?? 1;
                    return (
                      <tr key={comp.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{comp.code}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {language === 'vi' ? comp.nameVi : comp.nameEn}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isCrit}
                            onChange={() => toggleCritical(comp.code, idx)}
                            className="accent-rose-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step={0.5}
                            min={0.5}
                            max={10}
                            disabled={draft.weightMode === 'default_equal'}
                            value={draft.weightMode === 'default_equal' ? 1 : weight}
                            onChange={(e) => setWeight(comp.code, Number(e.target.value))}
                            className="w-16 px-2 py-1 text-right font-mono tabular-nums border border-slate-300 rounded disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            {language === 'vi' ? 'Đóng' : 'Cancel'}
          </button>
          {isAuthorized && (
            <button
              onClick={handleSave}
              disabled={saving || ratioSum !== 100}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : language === 'vi' ? 'Lưu cấu hình' : 'Save Configuration'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
