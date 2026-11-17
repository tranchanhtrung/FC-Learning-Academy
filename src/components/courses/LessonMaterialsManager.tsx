import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LessonMaterialDoc,
  LessonMaterialStorageMode,
  LessonMaterialType,
} from '../../types';
import {
  FIRESTORE_INLINE_MAX_BYTES,
  FIREBASE_STORAGE_MAX_BYTES,
  formatFileSizeLabel,
  inferMaterialTypeFromFile,
  getMaterialBlobUrl,
  downloadLessonMaterial,
  canPreviewInline,
} from '../../lib/lessonMaterials';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Presentation,
  Video,
  Link as LinkIcon,
  CheckSquare,
  File,
  Download,
  Eye,
  Trash2,
  Database,
  HardDrive,
  Search,
  Lock,
  CheckCircle2,
  X,
  Plus,
  ExternalLink,
  Cloud,
} from 'lucide-react';

interface LessonMaterialsManagerProps {
  initialCourseId?: string;
  initialLessonId?: string;
  compact?: boolean;
  lockSelection?: boolean;
}

const MATERIAL_TYPE_OPTIONS: { value: LessonMaterialType; labelVi: string; labelEn: string }[] = [
  { value: 'pdf', labelVi: 'Tài liệu PDF', labelEn: 'PDF Document' },
  { value: 'excel', labelVi: 'Bảng tính Excel / CSV', labelEn: 'Excel / CSV Model' },
  { value: 'slide', labelVi: 'Slide Bài Giảng (PPT)', labelEn: 'Slide Deck (PPT)' },
  { value: 'docx', labelVi: 'Tài liệu Word / Văn bản', labelEn: 'Word / Text Doc' },
  { value: 'checklist', labelVi: 'Checklist / SOP', labelEn: 'Checklist / SOP' },
  { value: 'video', labelVi: 'Video Bài Giảng', labelEn: 'Video Lecture' },
  { value: 'link', labelVi: 'Đường dẫn Tham khảo', labelEn: 'External Resource Link' },
  { value: 'other', labelVi: 'Học liệu Khác', labelEn: 'Other Material' },
];

function getMaterialIcon(type: LessonMaterialType) {
  switch (type) {
    case 'excel':
      return <FileSpreadsheet className="w-4 h-4 text-emerald-700" />;
    case 'pdf':
      return <FileText className="w-4 h-4 text-rose-700" />;
    case 'slide':
      return <Presentation className="w-4 h-4 text-amber-700" />;
    case 'video':
      return <Video className="w-4 h-4 text-indigo-700" />;
    case 'checklist':
      return <CheckSquare className="w-4 h-4 text-teal-700" />;
    case 'link':
      return <LinkIcon className="w-4 h-4 text-blue-700" />;
    default:
      return <File className="w-4 h-4 text-slate-600" />;
  }
}

function getStorageLabel(mode: LessonMaterialStorageMode, isVi: boolean): string {
  if (mode === 'firestore_inline') {
    return isVi ? 'Firestore Inline (Doc)' : 'Firestore Inline (Doc)';
  }
  if (mode === 'firebase_storage') {
    return 'Firebase Storage + Firestore';
  }
  return isVi ? 'External URL + Firestore' : 'External URL + Firestore';
}

export const LessonMaterialsManager: React.FC<LessonMaterialsManagerProps> = ({
  initialCourseId,
  initialLessonId,
  compact = false,
  lockSelection = false,
}) => {
  const {
    courses,
    lessonMaterials,
    uploadLessonMaterial,
    deleteLessonMaterial,
    hasPermission,
    language,
    dataSourceMode,
    firebaseUser,
    openAuthModal,
  } = useApp();

  const isVi = language === 'vi';
  const canManage = hasPermission('manage_lesson_materials');
  const isVerifiedFirebase = Boolean(firebaseUser?.emailVerified);
  const isLiveFirestore = dataSourceMode === 'firestore' && isVerifiedFirebase;

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.code.localeCompare(b.code)),
    [courses]
  );

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || sortedCourses[0]?.id || 'course_01'
  );

  const activeCourse = useMemo(
    () => sortedCourses.find((c) => c.id === selectedCourseId) || sortedCourses[0],
    [sortedCourses, selectedCourseId]
  );

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    initialLessonId || activeCourse?.modules[0]?.id || ''
  );

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  useEffect(() => {
    if (initialLessonId) {
      setSelectedLessonId(initialLessonId);
      return;
    }
    if (activeCourse && !activeCourse.modules.some((m) => m.id === selectedLessonId)) {
      setSelectedLessonId(activeCourse.modules[0]?.id || '');
    }
  }, [activeCourse, initialLessonId, selectedLessonId]);

  // Upload Form State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceKind, setSourceKind] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [preferredStorage, setPreferredStorage] = useState<'auto' | LessonMaterialStorageMode>('auto');
  const [materialType, setMaterialType] = useState<LessonMaterialType>('pdf');
  const [titleVi, setTitleVi] = useState<string>('');
  const [titleEn, setTitleEn] = useState<string>('');
  const [descriptionVi, setDescriptionVi] = useState<string>('');
  const [descriptionEn, setDescriptionEn] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(true);
  const [forceFirestore, setForceFirestore] = useState<boolean>(true);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Filter & Preview & Confirm Delete State
  const [filterCourseId, setFilterCourseId] = useState<string>(initialCourseId || 'all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<LessonMaterialDoc | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!previewMaterial) {
      setPreviewBlobUrl(null);
      setPreviewTextContent(null);
      return;
    }

    let revokedUrl: string | null = null;
    const url = getMaterialBlobUrl(previewMaterial);
    setPreviewBlobUrl(url);
    if (url && previewMaterial.storageMode === 'firestore_inline') {
      revokedUrl = url;
    }

    const mime = (previewMaterial.mimeType || '').toLowerCase();
    const ext = (previewMaterial.fileName || '').split('.').pop()?.toLowerCase() || '';
    if (
      previewMaterial.storageMode === 'firestore_inline' &&
      previewMaterial.inlineBase64 &&
      (mime.startsWith('text/') || ['txt', 'md', 'csv'].includes(ext))
    ) {
      try {
        const binary = atob(previewMaterial.inlineBase64);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const decoded = new TextDecoder('utf-8').decode(bytes);
        setPreviewTextContent(decoded);
      } catch {
        setPreviewTextContent(null);
      }
    } else {
      setPreviewTextContent(null);
    }

    return () => {
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [previewMaterial]);

  const handleFileChosen = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setSourceKind('file');
    const inferred = inferMaterialTypeFromFile(file);
    setMaterialType(inferred);
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
    if (!titleVi.trim()) setTitleVi(baseName);
    if (!titleEn.trim()) setTitleEn(baseName);
    if (file.size <= FIRESTORE_INLINE_MAX_BYTES) {
      setPreferredStorage('auto');
    } else {
      setPreferredStorage('firebase_storage');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !selectedCourseId || !selectedLessonId) return;

    setUploading(true);
    try {
      const saved = await uploadLessonMaterial({
        courseId: selectedCourseId,
        lessonId: selectedLessonId,
        titleVi: titleVi.trim() || selectedFile?.name || (isVi ? 'Học liệu bài học' : 'Lesson Material'),
        titleEn: titleEn.trim() || titleVi.trim() || selectedFile?.name || 'Lesson Material',
        descriptionVi: descriptionVi.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        materialType,
        isRequired,
        file: sourceKind === 'file' ? selectedFile : null,
        externalUrl: sourceKind === 'url' ? externalUrl.trim() : undefined,
        preferredStorage: sourceKind === 'url' ? 'external_link' : preferredStorage,
        forceFirestore: isVerifiedFirebase ? forceFirestore : false,
      });

      if (saved) {
        setSelectedFile(null);
        setExternalUrl('');
        setTitleVi('');
        setTitleEn('');
        setDescriptionVi('');
        setDescriptionEn('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteLessonMaterial(id);
      setConfirmDeleteId(null);
      if (previewMaterial?.id === id) {
        setPreviewMaterial(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const displayedMaterials = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return lessonMaterials.filter((m) => {
      if (compact && lockSelection) {
        if (m.courseId !== selectedCourseId || m.lessonId !== selectedLessonId) return false;
      } else {
        if (filterCourseId !== 'all' && m.courseId !== filterCourseId) return false;
      }
      if (filterType !== 'all' && m.materialType !== filterType) return false;
      if (!q) return true;
      return (
        m.titleVi.toLowerCase().includes(q) ||
        m.titleEn.toLowerCase().includes(q) ||
        m.courseCode.toLowerCase().includes(q) ||
        m.lessonTitleVi.toLowerCase().includes(q) ||
        m.lessonTitleEn.toLowerCase().includes(q) ||
        (m.fileName || '').toLowerCase().includes(q)
      );
    });
  }, [
    lessonMaterials,
    compact,
    lockSelection,
    selectedCourseId,
    selectedLessonId,
    filterCourseId,
    filterType,
    searchText,
  ]);

  const materialCountByLesson = useMemo(() => {
    const map: Record<string, number> = {};
    lessonMaterials.forEach((m) => {
      const key = `${m.courseId}::${m.lessonId}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [lessonMaterials]);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Persistence & Firestore Status Banner (Content Managers Only) */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
              <Database className="w-4 h-4 text-blue-700" />
              <span>
                {isVi
                  ? 'Kho Học Liệu Theo Từng Bài Học (Firestore Collection: /lessonMaterials)'
                  : 'Per-Lesson Learning Materials (Firestore Collection: /lessonMaterials)'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isVi
                ? 'Tệp ≤ 650 KB được mã hóa lưu trực tiếp trong Firestore Document (firestore_inline). Tệp lớn hơn đến 10 MB dùng Firebase Storage (firebase_storage) hoặc gắn External URL.'
                : 'Files ≤ 650 KB embed directly inside Firestore documents (firestore_inline). Larger files up to 10 MB upload to Firebase Storage (firebase_storage), plus External URL support.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isLiveFirestore ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Firestore Live · /lessonMaterials</span>
              </span>
            ) : isVerifiedFirebase ? (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceFirestore}
                  onChange={(e) => setForceFirestore(e.target.checked)}
                  className="rounded border-slate-300 text-blue-700"
                />
                <Cloud className="w-3.5 h-3.5 text-blue-700" />
                <span>
                  {isVi ? 'Ghi trực tiếp vào Firestore Live' : 'Write directly to Firestore Live'}
                </span>
              </label>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                  {isVi ? 'Chế độ Demo Sandbox (/api/lesson-materials)' : 'Demo Sandbox (/api/lesson-materials)'}
                </span>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1.5 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  {isVi ? 'Đăng nhập Firebase' : 'Firebase Sign-In'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Form (RBAC Guarded: manage_lesson_materials) */}
      {canManage && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                {isVi ? 'Tải Lên Học Liệu Mới Cho Bài Học' : 'Upload New Lesson Learning Material'}
              </h3>
            </div>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSourceKind('file')}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  sourceKind === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {isVi ? 'Tải tệp từ máy' : 'Upload File'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceKind('url');
                  setMaterialType('link');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  sourceKind === 'url' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {isVi ? 'Gắn URL Tài nguyên' : 'External URL'}
              </button>
            </div>
          </div>

          {/* Course & Lesson Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                {isVi ? '1. Chọn Khóa Học (Course)' : '1. Select Course'}
              </label>
              <select
                value={selectedCourseId}
                disabled={lockSelection}
                onChange={(e) => {
                  const nextCourseId = e.target.value;
                  setSelectedCourseId(nextCourseId);
                  const nextCourse = sortedCourses.find((c) => c.id === nextCourseId);
                  setSelectedLessonId(nextCourse?.modules[0]?.id || '');
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-600"
              >
                {sortedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {isVi ? c.titleVi : c.titleEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                {isVi ? '2. Chọn Bài Học Cụ Thể (Lesson / Module)' : '2. Select Specific Lesson'}
              </label>
              <select
                value={selectedLessonId}
                disabled={lockSelection}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-600"
              >
                {(activeCourse?.modules || []).map((mod, idx) => {
                  const cnt = materialCountByLesson[`${activeCourse?.id}::${mod.id}`] || 0;
                  return (
                    <option key={mod.id} value={mod.id}>
                      {isVi ? `Bài ${idx + 1}` : `Lesson ${idx + 1}`}: {isVi ? mod.titleVi : mod.titleEn}
                      {cnt > 0 ? ` (${cnt})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* File Dropzone OR External URL Input */}
          {sourceKind === 'file' ? (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileChosen(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-50/70'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt,.txt,.md,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => handleFileChosen(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      {getMaterialIcon(materialType)}
                      <span>{selectedFile.name}</span>
                    </div>
                    <span className="font-mono tabular-nums text-emerald-800 font-semibold">
                      {formatFileSizeLabel(selectedFile.size)}
                    </span>
                    <span className="text-slate-500">
                      {selectedFile.size <= FIRESTORE_INLINE_MAX_BYTES
                        ? isVi
                          ? 'Đủ chuẩn Firestore Inline (≤650KB)'
                          : 'Fits Firestore Inline (≤650KB)'
                        : selectedFile.size <= FIREBASE_STORAGE_MAX_BYTES
                        ? isVi
                          ? 'Dùng Firebase Storage (≤10MB)'
                          : 'Uses Firebase Storage (≤10MB)'
                        : isVi
                        ? 'Vượt giới hạn 10MB'
                        : 'Exceeds 10MB cap'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      {isVi
                        ? 'Kéo thả tệp vào đây hoặc bấm để chọn từ máy tính'
                        : 'Drag & drop file here or click to browse'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      PDF · XLSX / XLS / CSV · PPTX / PPT · DOCX · TXT / MD · PNG / JPG (Max 10 MB)
                    </p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">
                      {isVi ? 'Cơ chế lưu trữ Firestore' : 'Storage Strategy'}
                    </label>
                    <select
                      value={preferredStorage}
                      onChange={(e) =>
                        setPreferredStorage(e.target.value as 'auto' | LessonMaterialStorageMode)
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
                    >
                      <option value="auto">
                        {isVi
                          ? 'Tự động (≤650KB: Firestore Inline · >650KB: Storage)'
                          : 'Auto (≤650KB: Firestore Inline · >650KB: Storage)'}
                      </option>
                      <option
                        value="firestore_inline"
                        disabled={selectedFile.size > FIRESTORE_INLINE_MAX_BYTES}
                      >
                        {isVi
                          ? 'Lưu trực tiếp trong Firestore Document (≤650KB)'
                          : 'Direct Firestore Document Inline (≤650KB)'}
                      </option>
                      <option value="firebase_storage">
                        Firebase Storage + Firestore Metadata (≤10MB)
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">
                      {isVi ? 'Loại học liệu' : 'Material Type'}
                    </label>
                    <select
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value as LessonMaterialType)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
                    >
                      {MATERIAL_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {isVi ? opt.labelVi : opt.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  {isVi ? 'Đường dẫn URL (Google Drive, SharePoint, Video, PDF)' : 'Resource URL'}
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://..."
                  required={sourceKind === 'url'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  {isVi ? 'Loại học liệu' : 'Material Type'}
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as LessonMaterialType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  {MATERIAL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isVi ? opt.labelVi : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Titles & Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                {isVi ? 'Tiêu đề Tiếng Việt' : 'Vietnamese Title'}
              </label>
              <input
                type="text"
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                placeholder={isVi ? 'VD: Mẫu Bảng Tính USALI Schedule 1' : 'e.g. Mẫu Bảng Tính USALI Schedule 1'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                {isVi ? 'Tiêu đề Tiếng Anh' : 'English Title'}
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. USALI Schedule 1 Working Template"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                {isVi ? 'Mô tả ngắn (VI)' : 'Short Description (VI)'}
              </label>
              <input
                type="text"
                value={descriptionVi}
                onChange={(e) => setDescriptionVi(e.target.value)}
                placeholder={isVi ? 'Hướng dẫn áp dụng cho bài học này...' : 'Optional Vietnamese notes...'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                {isVi ? 'Mô tả ngắn (EN)' : 'Short Description (EN)'}
              </label>
              <input
                type="text"
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder="Optional English usage instructions..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-slate-300 text-amber-600"
              />
              <span>
                {isVi
                  ? 'Đánh dấu là học liệu bắt buộc của bài học'
                  : 'Mark as mandatory lesson reading/template'}
              </span>
            </label>

            <button
              type="submit"
              disabled={
                uploading ||
                (sourceKind === 'file' && !selectedFile) ||
                (sourceKind === 'url' && !externalUrl.trim())
              }
              className="px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] disabled:opacity-50 text-amber-400 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              <span>
                {uploading
                  ? isVi
                    ? 'Đang lưu học liệu...'
                    : 'Uploading Material...'
                  : isVi
                  ? 'Lưu Học Liệu Vào Bài Học'
                  : 'Save Lesson Material'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar (Catalog / Full View Only) */}
      {!compact && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={
                  isVi
                    ? 'Tìm tên học liệu, mã khóa học, tên bài học, tên tệp...'
                    : 'Search material title, course code, lesson, filename...'
                }
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50"
              />
            </div>

            <select
              value={filterCourseId}
              onChange={(e) => setFilterCourseId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800"
            >
              <option value="all">{isVi ? 'Tất cả 18 khóa học' : 'All 18 Courses'}</option>
              {sortedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {isVi ? c.titleVi : c.titleEn}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800"
            >
              <option value="all">{isVi ? 'Mọi định dạng' : 'All Material Types'}</option>
              {MATERIAL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {isVi ? opt.labelVi : opt.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-mono font-bold text-slate-600 tabular-nums shrink-0">
            {displayedMaterials.length} {isVi ? 'học liệu' : 'materials'}
          </div>
        </div>
      )}

      {/* Uploaded Materials List */}
      <div className="space-y-3">
        {displayedMaterials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-500">
            {isVi
              ? 'Chưa có học liệu riêng nào được upload cho phạm vi bài học này.'
              : 'No uploaded materials found for this lesson scope yet.'}
          </div>
        ) : (
          displayedMaterials.map((mat) => {
            const title = isVi ? mat.titleVi : mat.titleEn;
            const desc = isVi ? mat.descriptionVi || mat.descriptionEn : mat.descriptionEn || mat.descriptionVi;
            const lessonName = isVi ? mat.lessonTitleVi : mat.lessonTitleEn;
            const showPreviewBtn = canPreviewInline(mat) || Boolean(mat.downloadUrl);

            return (
              <div
                key={mat.id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400/80 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    {getMaterialIcon(mat.materialType)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-mono font-extrabold text-slate-900">{mat.courseCode}</span>
                      <span className="text-slate-300">&middot;</span>
                      <span className="font-semibold text-blue-700">
                        {isVi ? `Bài ${mat.lessonOrder}` : `Lesson ${mat.lessonOrder}`}: {lessonName}
                      </span>
                      {mat.isRequired && (
                        <>
                          <span className="text-slate-300">&middot;</span>
                          <span className="font-bold text-rose-700 text-[11px]">
                            {isVi ? 'Bắt buộc' : 'Required'}
                          </span>
                        </>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900 truncate">{title}</h4>

                    {desc && <p className="text-xs text-slate-600 line-clamp-2">{desc}</p>}

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 font-mono tabular-nums pt-0.5">
                      {canManage && (
                        <>
                          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                            <HardDrive className="w-3 h-3 text-slate-400" />
                            {getStorageLabel(mat.storageMode, isVi)}
                          </span>
                          <span>&middot;</span>
                        </>
                      )}
                      <span>{mat.fileSizeLabel}</span>
                      {mat.fileName && (
                        <>
                          <span>&middot;</span>
                          <span className="truncate max-w-[200px]">{mat.fileName}</span>
                        </>
                      )}
                      <span>&middot;</span>
                      <span className="font-sans">
                        {mat.uploadedByName} ({new Date(mat.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-13 lg:pl-0">
                  {showPreviewBtn && (
                    <button
                      type="button"
                      onClick={() => setPreviewMaterial(mat)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isVi ? 'Xem' : 'Preview'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => downloadLessonMaterial(mat)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {mat.storageMode === 'external_link' ? (
                      <ExternalLink className="w-3.5 h-3.5" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {mat.storageMode === 'external_link'
                        ? isVi
                          ? 'Mở Link'
                          : 'Open Link'
                        : isVi
                        ? 'Tải Xuống'
                        : 'Download'}
                    </span>
                  </button>

                  {canManage && (
                    confirmDeleteId === mat.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={deletingId === mat.id}
                          onClick={() => handleDelete(mat.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                        >
                          {deletingId === mat.id
                            ? '...'
                            : isVi
                            ? 'Xác nhận'
                            : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold cursor-pointer"
                        >
                          {isVi ? 'Hủy' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(mat.id)}
                        className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                        title={isVi ? 'Xóa học liệu' : 'Delete Material'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inline Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0A192F] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-amber-400">
                  {previewMaterial.courseCode} · {isVi ? `Bài ${previewMaterial.lessonOrder}` : `Lesson ${previewMaterial.lessonOrder}`} · {previewMaterial.fileSizeLabel}
                </div>
                <h4 className="font-extrabold text-sm truncate">
                  {isVi ? previewMaterial.titleVi : previewMaterial.titleEn}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadLessonMaterial(previewMaterial)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Tải xuống' : 'Download'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMaterial(null)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center">
              {previewTextContent !== null ? (
                <pre className="w-full h-full bg-white rounded-xl border border-slate-200 p-4 text-xs font-mono text-slate-800 overflow-auto whitespace-pre-wrap">
                  {previewTextContent}
                </pre>
              ) : previewBlobUrl && (previewMaterial.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(previewMaterial.fileName || '')) ? (
                <img
                  src={previewBlobUrl}
                  alt={isVi ? previewMaterial.titleVi : previewMaterial.titleEn}
                  className="max-w-full max-h-full rounded-xl shadow-md object-contain"
                />
              ) : previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
                  title={isVi ? previewMaterial.titleVi : previewMaterial.titleEn}
                  className="w-full h-full rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-xs text-slate-500">
                  {isVi
                    ? 'Định dạng tệp này không hỗ trợ xem trực tiếp. Vui lòng bấm Tải xuống.'
                    : 'Inline preview is not supported for this file type. Please click Download.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
