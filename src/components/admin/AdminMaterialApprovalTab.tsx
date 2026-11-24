import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LessonMaterialDoc, MaterialApprovalStatus } from '../../types';
import { LessonMaterialsManager } from '../courses/LessonMaterialsManager';
import { LessonMaterialPreviewModal } from '../courses/LessonMaterialPreviewModal';
import { downloadLessonMaterial } from '../../lib/lessonMaterials';
import {
  FileCheck2,
  Upload,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ShieldCheck,
  Search,
  X,
} from 'lucide-react';

export const AdminMaterialApprovalTab: React.FC = () => {
  const {
    lessonMaterials,
    siteAdminConfig,
    saveSiteAdminConfig,
    getMaterialApprovalStatus,
    reviewLessonMaterial,
    deleteLessonMaterial,
    language,
  } = useApp();
  const isVi = language === 'vi';

  const [subTab, setSubTab] = useState<'review' | 'upload'>('review');
  const [statusFilter, setStatusFilter] = useState<'all' | MaterialApprovalStatus>('all');
  const [searchText, setSearchText] = useState('');
  const [previewDoc, setPreviewDoc] = useState<LessonMaterialDoc | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<LessonMaterialDoc | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    lessonMaterials.forEach((m) => {
      const st = getMaterialApprovalStatus(m);
      if (st === 'pending') pending++;
      else if (st === 'rejected') rejected++;
      else approved++;
    });
    return { all: lessonMaterials.length, pending, approved, rejected };
  }, [lessonMaterials, getMaterialApprovalStatus]);

  const filteredMaterials = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return lessonMaterials.filter((m) => {
      const st = getMaterialApprovalStatus(m);
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (!q) return true;
      return (
        m.titleVi.toLowerCase().includes(q) ||
        m.titleEn.toLowerCase().includes(q) ||
        m.courseCode.toLowerCase().includes(q) ||
        (m.fileName || '').toLowerCase().includes(q) ||
        m.uploadedByName.toLowerCase().includes(q)
      );
    });
  }, [lessonMaterials, getMaterialApprovalStatus, statusFilter, searchText]);

  const handleToggleRequireApproval = async () => {
    const nextVal = !siteAdminConfig.general.requireMaterialApproval;
    await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        general: {
          ...prev.general,
          requireMaterialApproval: nextVal,
        },
      }),
      nextVal
        ? isVi
          ? 'Đã bật chế độ Kiểm duyệt tài liệu: File mới tải lên sẽ ở trạng thái Chờ Duyệt trước khi hiển thị cho học viên.'
          : 'Pre-publish moderation enabled for newly uploaded materials.'
        : isVi
        ? 'Đã tắt kiểm duyệt bắt buộc: Tài liệu mới tải lên sẽ tự động công khai.'
        : 'Moderation switched to auto-publish.'
    );
  };

  return (
    <div className="space-y-5">
      {/* Sub-tab Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('review')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'review' ? 'bg-[#0A192F] text-amber-400' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>
              {isVi ? 'Hàng Đợi Duyệt Tài Liệu' : 'Document Approval Queue'} ({counts.all})
            </span>
            {counts.pending > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                {counts.pending}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('upload')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'upload' ? 'bg-[#0A192F] text-amber-400' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isVi ? 'Tải Lên Học Liệu Mới' : 'Upload New Material'}</span>
          </button>
        </div>

        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={siteAdminConfig.general.requireMaterialApproval}
            onChange={handleToggleRequireApproval}
            className="accent-amber-500"
          />
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            {isVi ? 'Yêu cầu Admin duyệt trước khi hiển thị cho học viên' : 'Require Admin approval before learners see files'}
          </span>
        </label>
      </div>

      {subTab === 'upload' ? (
        <LessonMaterialsManager />
      ) : (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: isVi ? `Tất cả (${counts.all})` : `All (${counts.all})` },
                  { id: 'pending', label: isVi ? `Chờ duyệt (${counts.pending})` : `Pending (${counts.pending})` },
                  { id: 'approved', label: isVi ? `Đã duyệt (${counts.approved})` : `Approved (${counts.approved})` },
                  { id: 'rejected', label: isVi ? `Từ chối (${counts.rejected})` : `Rejected (${counts.rejected})` },
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                    statusFilter === pill.id
                      ? 'bg-slate-900 text-amber-400'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={isVi ? 'Tìm tên tài liệu, mã khóa, người tải...' : 'Search materials...'}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
              {isVi ? 'Không có tài liệu nào trong mục này.' : 'No learning materials in this view.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMaterials.map((mat) => {
                const status = getMaterialApprovalStatus(mat);
                const reviewRec = siteAdminConfig.materialApprovals?.[mat.id];
                return (
                  <div
                    key={mat.id}
                    className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono font-bold text-[10px]">
                          {mat.courseCode}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-700">
                          {isVi ? `Bài ${mat.lessonOrder}` : `Lesson ${mat.lessonOrder}`}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {status === 'approved' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : status === 'pending' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>
                            {status === 'approved'
                              ? isVi
                                ? 'Đã duyệt · Công khai'
                                : 'Approved'
                              : status === 'pending'
                              ? isVi
                                ? 'Chờ Admin duyệt'
                                : 'Pending Review'
                              : isVi
                              ? 'Đã từ chối'
                              : 'Rejected'}
                          </span>
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">
                        {isVi ? mat.titleVi : mat.titleEn}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {mat.fileName || mat.externalUrl || mat.materialType} · {mat.fileSizeLabel} ·{' '}
                        {isVi ? 'Người tải:' : 'By:'} <strong>{mat.uploadedByName}</strong>
                      </p>
                      {reviewRec?.reviewNotes && (
                        <p className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block mt-1">
                          {isVi ? 'Ghi chú duyệt:' : 'Review note:'} {reviewRec.reviewNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(mat)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isVi ? 'Xem' : 'Preview'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadLessonMaterial(mat)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Tải' : 'Download'}</span>
                      </button>
                      {status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => void reviewLessonMaterial(mat.id, 'approved')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Phê Duyệt' : 'Approve'}</span>
                        </button>
                      )}
                      {status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingDoc(mat);
                            setRejectReason(reviewRec?.reviewNotes || '');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Từ Chối' : 'Reject'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteLessonMaterial(mat.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                        title={isVi ? 'Xoá tài liệu' : 'Delete material'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inline Preview Modal */}
      <LessonMaterialPreviewModal
        material={previewDoc}
        materials={filteredMaterials}
        isVi={isVi}
        onSelectMaterial={setPreviewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Reject With Reason Modal */}
      {rejectingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingDoc(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-extrabold text-sm text-slate-900">
                {isVi ? 'Từ Chối / Ẩn Tài Liệu Học Tập' : 'Reject / Unpublish Material'}
              </h4>
              <button type="button" onClick={() => setRejectingDoc(null)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600">
              {isVi ? 'Tài liệu:' : 'Material:'} <strong className="text-slate-900">{rejectingDoc.titleVi}</strong>
            </p>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {isVi ? 'Lý do từ chối / Yêu cầu chỉnh sửa:' : 'Rejection / Revision Notes:'}
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={isVi ? 'Ví dụ: Cần cập nhật bảng công thức theo chuẩn USALI 12th...' : 'Reason...'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingDoc(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold cursor-pointer"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await reviewLessonMaterial(rejectingDoc.id, 'rejected', rejectReason);
                  if (ok) setRejectingDoc(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold cursor-pointer"
              >
                {isVi ? 'Xác Nhận Từ Chối' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
