import React, { useEffect, useState, useMemo } from 'react';
import { LessonMaterialDoc } from '../../types';
import { COURSES } from '../../data/initialData';
import {
  detectPreviewKind,
  downloadLessonMaterial,
  getMaterialArrayBuffer,
  getMaterialBlobUrl,
  getYouTubeOrVimeoEmbedUrl,
  sanitizeDocxHtml,
  resolveMaterialLessonInfo,
  MaterialPreviewKind,
} from '../../lib/lessonMaterials';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  BookOpen,
  Search,
  Printer,
  Presentation,
} from 'lucide-react';

interface ParsedSheet {
  name: string;
  rows: string[][];
}

interface LessonMaterialContentRendererProps {
  material: LessonMaterialDoc;
  isVi: boolean;
  embedded?: boolean;
}

export const LessonMaterialContentRenderer: React.FC<LessonMaterialContentRendererProps> = ({
  material,
  isVi,
  embedded = false,
}) => {
  const kind: MaterialPreviewKind = useMemo(() => detectPreviewKind(material), [material]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [sheetSearch, setSheetSearch] = useState<string>('');
  const [textContent, setTextContent] = useState<string | null>(null);
  const [pptxSlides, setPptxSlides] = useState<Array<{ number: number; lines: string[] }>>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);

  useEffect(() => {
    let active = true;
    let objectUrlToRevoke: string | null = null;

    setLoading(false);
    setErrorMsg(null);
    setBlobUrl(null);
    setDocxHtml(null);
    setSheets([]);
    setActiveSheetIndex(0);
    setSheetSearch('');
    setTextContent(null);
    setPptxSlides([]);
    setActiveSlideIdx(0);

    const loadContent = async () => {
      try {
        if (kind === 'pdf' || kind === 'image') {
          const url = getMaterialBlobUrl(material);
          if (material.storageMode === 'firestore_inline' && url) {
            objectUrlToRevoke = url;
          }
          if (active) setBlobUrl(url);
          return;
        }

        if (kind === 'video') {
          const rawUrl = material.downloadUrl || material.externalUrl || '';
          const embed = getYouTubeOrVimeoEmbedUrl(rawUrl);
          if (embed) {
            if (active) setBlobUrl(embed);
            return;
          }
          const url = getMaterialBlobUrl(material);
          if (material.storageMode === 'firestore_inline' && url) {
            objectUrlToRevoke = url;
          }
          if (active) setBlobUrl(url);
          return;
        }

        if (kind === 'link') {
          const url = material.downloadUrl || material.externalUrl || null;
          if (active) setBlobUrl(url);
          return;
        }

        if (kind === 'docx') {
          if (active) setLoading(true);
          const [buffer, mammothMod] = await Promise.all([
            getMaterialArrayBuffer(material),
            import('mammoth'),
          ]);
          const mammothApi: any = (mammothMod as any).default || mammothMod;
          const result = await mammothApi.convertToHtml({ arrayBuffer: buffer });
          const cleanHtml = sanitizeDocxHtml(result.value || '');
          if (active) {
            setDocxHtml(
              cleanHtml ||
                `<p>${
                  isVi
                    ? 'Tài liệu Word không có nội dung văn bản hiển thị.'
                    : 'This Word document contains no displayable text.'
                }</p>`
            );
          }
          return;
        }

        if (kind === 'pptx') {
          if (active) setLoading(true);
          const remoteUrl = material.downloadUrl || material.externalUrl || '';
          if (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://')) {
            if (active) {
              setBlobUrl(
                `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(remoteUrl)}`
              );
            }
            return;
          }
          // Inline/local .pptx: parse slide XML text via SheetJS CFB/ZIP reader or show clear fallback
          try {
            const buffer = await getMaterialArrayBuffer(material);
            const XLSXMod: any = await import('xlsx');
            const cfb = XLSXMod.CFB?.read?.(new Uint8Array(buffer), { type: 'array' });
            const extracted: Array<{ number: number; lines: string[] }> = [];
            if (cfb && Array.isArray(cfb.FullPaths)) {
              const slideEntries = cfb.FullPaths.map((p: string, i: number) => ({ path: p, idx: i }))
                .filter((e: { path: string }) => /ppt\/slides\/slide\d+\.xml$/i.test(e.path))
                .sort((a: { path: string }, b: { path: string }) => {
                  const na = Number(a.path.match(/slide(\d+)\.xml/i)?.[1] || 0);
                  const nb = Number(b.path.match(/slide(\d+)\.xml/i)?.[1] || 0);
                  return na - nb;
                });
              for (const entry of slideEntries) {
                const rawContent = cfb.FileIndex[entry.idx]?.content;
                if (!rawContent) continue;
                const xml = new TextDecoder('utf-8').decode(new Uint8Array(rawContent));
                const matches = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) =>
                  m[1]
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .trim()
                );
                const lines = matches.filter(Boolean);
                extracted.push({ number: extracted.length + 1, lines });
              }
            }
            if (active && extracted.length > 0) {
              setPptxSlides(extracted);
              setActiveSlideIdx(0);
              return;
            }
          } catch {
            // Fall through to clean download prompt
          }
          if (active) {
            setErrorMsg(
              isVi
                ? 'Slide PowerPoint này chưa thể đọc trực tiếp trong trình duyệt. Nhấn Tải Xuống để mở bằng PowerPoint.'
                : 'This PowerPoint slide deck cannot be rendered inline. Click Download to open in PowerPoint.'
            );
          }
          return;
        }

        if (kind === 'excel') {
          if (active) setLoading(true);
          const [buffer, XLSX] = await Promise.all([
            getMaterialArrayBuffer(material),
            import('xlsx'),
          ]);
          const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
          const parsed: ParsedSheet[] = wb.SheetNames.map((name) => {
            const ws = wb.Sheets[name];
            const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, {
              header: 1,
              defval: '',
            });
            const normalizedRows = rawRows.slice(0, 500).map((row) =>
              (Array.isArray(row) ? row : []).map((cell) =>
                cell === null || cell === undefined ? '' : String(cell)
              )
            );
            return { name, rows: normalizedRows };
          });
          if (active) {
            setSheets(parsed);
            setActiveSheetIndex(0);
          }
          return;
        }

        if (kind === 'text') {
          if (active) setLoading(true);
          if (material.inlineBase64) {
            const binary = atob(material.inlineBase64);
            const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
            const decoded = new TextDecoder('utf-8').decode(bytes);
            if (active) setTextContent(decoded);
          } else {
            const buffer = await getMaterialArrayBuffer(material);
            const decoded = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
            if (active) setTextContent(decoded);
          }
          return;
        }
      } catch (err: any) {
        if (active) {
          setErrorMsg(
            err?.message ||
              (isVi
                ? 'Không thể đọc trực tiếp tệp này trong trình duyệt. Bạn có thể bấm Tải xuống để mở bằng ứng dụng máy tính.'
                : 'Unable to render this file inline. Click Download to open locally.')
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadContent();

    return () => {
      active = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [material, kind, isVi]);

  const containerHeight = embedded ? 'min-h-[420px] max-h-[65vh]' : 'h-full';

  if (loading) {
    return (
      <div className={`w-full ${containerHeight} flex flex-col items-center justify-center gap-3 p-8 text-slate-600`}>
        <Loader2 className="w-7 h-7 animate-spin text-blue-700" />
        <p className="text-xs font-semibold">
          {isVi ? 'Đang giải mã và hiển thị nội dung bài học...' : 'Decoding and rendering lesson content...'}
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={`w-full ${containerHeight} flex flex-col items-center justify-center gap-3 p-8 text-center`}>
        <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-bold text-slate-900">
            {isVi ? 'Không thể xem trực tiếp tệp từ đường dẫn từ xa' : 'Unable to preview remote file inline'}
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">{errorMsg}</p>
        </div>
        <button
          type="button"
          onClick={() => downloadLessonMaterial(material)}
          className="px-4 py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isVi ? 'Tải Xuống Để Xem Đầy Đủ' : 'Download Material'}</span>
        </button>
      </div>
    );
  }

  if (kind === 'docx' && docxHtml !== null) {
    const handlePrintDocx = () => {
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) return;
      win.document.write(
        `<!doctype html><html><head><meta charset="utf-8"><title>${
          (material.titleVi || material.fileName || 'Document').replace(/</g, '&lt;')
        }</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:820px;margin:32px auto;padding:0 24px;line-height:1.65;color:#1e293b}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left}img{max-width:100%}</style></head><body>${docxHtml}</body></html>`
      );
      win.document.close();
      setTimeout(() => win.print(), 250);
    };

    return (
      <div className={`w-full ${containerHeight} overflow-y-auto p-3 sm:p-5`}>
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100 text-[11px] font-mono text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700">
              <FileText className="w-3.5 h-3.5" />
              {material.fileName || 'Document.docx'}
            </span>
            <div className="flex items-center gap-3">
              <span className="tabular-nums">{material.fileSizeLabel}</span>
              <button
                type="button"
                onClick={handlePrintDocx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-sans font-bold cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>{isVi ? 'In / Lưu PDF' : 'Print / PDF'}</span>
              </button>
            </div>
          </div>
          <article
            className="text-slate-800 text-sm leading-relaxed space-y-3
              [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-slate-950 [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:leading-snug
              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:pt-2 [&_h2]:border-t [&_h2]:border-slate-100
              [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-4 [&_h3]:mb-1.5
              [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-slate-800 [&_h4]:mt-3 [&_h4]:mb-1
              [&_p]:text-[13.5px] [&_p]:leading-7 [&_p]:text-slate-700 [&_p]:mb-2.5
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-3 [&_ul]:text-[13.5px] [&_ul]:text-slate-700
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-3 [&_ol]:text-[13.5px] [&_ol]:text-slate-700
              [&_strong]:font-bold [&_strong]:text-slate-950
              [&_a]:text-blue-700 [&_a]:underline
              [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-3
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-xs
              [&_th]:bg-slate-100 [&_th]:text-slate-900 [&_th]:font-bold [&_th]:text-left [&_th]:border [&_th]:border-slate-300 [&_th]:px-3 [&_th]:py-2
              [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-slate-700 [&_td]:align-top
              [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3"
            dangerouslySetInnerHTML={{ __html: docxHtml }}
          />
        </div>
      </div>
    );
  }

  if (kind === 'pptx' && pptxSlides.length > 0) {
    const slide = pptxSlides[activeSlideIdx] || pptxSlides[0];
    return (
      <div className={`w-full ${containerHeight} flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden`}>
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Presentation className="w-4 h-4 text-amber-600" />
            <span>
              Slide {slide.number} / {pptxSlides.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={activeSlideIdx <= 0}
              onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={activeSlideIdx >= pptxSlides.length - 1}
              onClick={() => setActiveSlideIdx((i) => Math.min(pptxSlides.length - 1, i + 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100/80 flex items-start justify-center">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-3">
            {slide.lines.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                {isVi ? '(Slide chỉ chứa hình ảnh hoặc biểu đồ)' : '(Visual-only slide)'}
              </p>
            ) : (
              slide.lines.map((line, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'text-lg sm:text-xl font-extrabold text-slate-900 pb-2 border-b border-slate-100'
                      : 'text-sm text-slate-700 leading-relaxed'
                  }
                >
                  {line}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'pptx' && blobUrl) {
    return (
      <div className={`w-full ${containerHeight} flex flex-col gap-2`}>
        <iframe
          src={blobUrl}
          title={isVi ? material.titleVi : material.titleEn}
          className="w-full flex-1 min-h-[420px] rounded-xl border border-slate-200 bg-white"
        />
      </div>
    );
  }

  if (kind === 'excel' && sheets.length > 0) {
    const currentSheet = sheets[activeSheetIndex] || sheets[0];
    const maxCols = currentSheet.rows.reduce((m, r) => Math.max(m, r.length), 0);
    const query = sheetSearch.trim().toLowerCase();
    const bodyRows = currentSheet.rows.slice(1).filter((row) =>
      !query ? true : row.some((cell) => cell.toLowerCase().includes(query))
    );

    return (
      <div className={`w-full ${containerHeight} flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden`}>
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0 mr-1" />
            {sheets.map((sheet, idx) => (
              <button
                key={sheet.name}
                type="button"
                onClick={() => {
                  setActiveSheetIndex(idx);
                  setSheetSearch('');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  idx === activeSheetIndex
                    ? 'bg-[#0A192F] text-amber-400'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {sheet.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder={isVi ? 'Lọc dòng...' : 'Filter rows...'}
                className="pl-7 pr-2.5 py-1 text-[11px] rounded-lg border border-slate-300 bg-white w-36 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
              {bodyRows.length}/{Math.max(0, currentSheet.rows.length - 1)} {isVi ? 'dòng' : 'rows'} · {maxCols} {isVi ? 'cột' : 'cols'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {currentSheet.rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {isVi ? 'Sheet này chưa có dữ liệu.' : 'This worksheet is empty.'}
            </div>
          ) : (
            <table className="w-full border-collapse text-xs font-mono tabular-nums">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="px-2.5 py-2 text-right text-[10px] font-bold text-slate-400 border-r border-slate-200 w-10">
                    #
                  </th>
                  {Array.from({ length: maxCols }).map((_, cIdx) => (
                    <th
                      key={cIdx}
                      className="px-3 py-2 text-left font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap font-sans"
                    >
                      {currentSheet.rows[0]?.[cIdx] || `Col ${cIdx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-amber-50/40">
                    <td className="px-2.5 py-1.5 text-right text-[10px] text-slate-400 bg-slate-50/70 border-r border-slate-200">
                      {rIdx + 2}
                    </td>
                    {Array.from({ length: maxCols }).map((_, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-1.5 text-slate-700 border-r border-slate-100 max-w-[260px] truncate font-sans"
                        title={row[cIdx] || ''}
                      >
                        {row[cIdx] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (kind === 'text' && textContent !== null) {
    return (
      <div className={`w-full ${containerHeight} overflow-y-auto p-3 sm:p-5`}>
        <pre className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 p-5 sm:p-7 text-xs sm:text-[13px] leading-relaxed font-mono text-slate-800 whitespace-pre-wrap">
          {textContent}
        </pre>
      </div>
    );
  }

  if (kind === 'image' && blobUrl) {
    return (
      <div className={`w-full ${containerHeight} flex items-center justify-center p-4 overflow-auto`}>
        <img
          src={blobUrl}
          alt={isVi ? material.titleVi : material.titleEn}
          referrerPolicy="no-referrer"
          className="max-w-full max-h-full rounded-xl shadow-md object-contain bg-white"
        />
      </div>
    );
  }

  if (kind === 'video' && blobUrl) {
    const isEmbed = blobUrl.includes('youtube.com/embed') || blobUrl.includes('player.vimeo.com');
    return (
      <div className={`w-full ${containerHeight} flex items-center justify-center p-3 sm:p-5`}>
        {isEmbed ? (
          <iframe
            src={blobUrl}
            title={isVi ? material.titleVi : material.titleEn}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full min-h-[380px] rounded-xl border border-slate-200 bg-black"
          />
        ) : (
          <video
            src={blobUrl}
            controls
            className="w-full max-h-full rounded-xl border border-slate-200 bg-black"
          />
        )}
      </div>
    );
  }

  if (kind === 'pdf' && blobUrl) {
    return (
      <div className={`w-full ${containerHeight} flex flex-col gap-2`}>
        <iframe
          src={blobUrl}
          title={isVi ? material.titleVi : material.titleEn}
          className="w-full flex-1 min-h-[420px] rounded-xl border border-slate-200 bg-white"
        />
        <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500">
          <span>
            {isVi
              ? 'Nếu trình duyệt chặn hiển thị PDF nhúng, vui lòng mở tab mới hoặc tải xuống.'
              : 'If embedded PDF does not load in your browser, open it in a new tab or download.'}
          </span>
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{isVi ? 'Mở tab mới' : 'Open tab'}</span>
          </a>
        </div>
      </div>
    );
  }

  if (kind === 'link' && blobUrl) {
    return (
      <div className={`w-full ${containerHeight} flex flex-col gap-3 p-3 sm:p-5`}>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">
              {isVi ? material.titleVi : material.titleEn}
            </div>
            <div className="text-[11px] font-mono text-slate-500 truncate">{blobUrl}</div>
          </div>
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{isVi ? 'Mở Đường Dẫn Trong Tab Mới' : 'Open Resource in New Tab'}</span>
          </a>
        </div>
        <iframe
          src={blobUrl}
          title={isVi ? material.titleVi : material.titleEn}
          className="w-full flex-1 min-h-[340px] rounded-xl border border-slate-200 bg-white"
        />
      </div>
    );
  }

  return (
    <div className={`w-full ${containerHeight} flex flex-col items-center justify-center gap-3 p-8 text-center`}>
      <p className="text-xs text-slate-600">
        {isVi
          ? 'Định dạng tệp này chưa hỗ trợ xem trước trực tiếp. Vui lòng tải xuống để xem.'
          : 'Inline preview is unavailable for this file format. Please download to open.'}
      </p>
      <button
        type="button"
        onClick={() => downloadLessonMaterial(material)}
        className="px-4 py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{isVi ? 'Tải xuống' : 'Download'}</span>
      </button>
    </div>
  );
};

interface LessonMaterialPreviewModalProps {
  material: LessonMaterialDoc | null;
  materials?: LessonMaterialDoc[];
  isVi: boolean;
  onSelectMaterial?: (mat: LessonMaterialDoc) => void;
  onOpenLesson?: (mat: LessonMaterialDoc) => void;
  onClose: () => void;
}

export const LessonMaterialPreviewModal: React.FC<LessonMaterialPreviewModalProps> = ({
  material,
  materials,
  isVi,
  onSelectMaterial,
  onOpenLesson,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const list = materials && materials.length > 0 ? materials : material ? [material] : [];
  const currentIdx = material ? list.findIndex((m) => m.id === material.id) : -1;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < list.length - 1;

  // CRITICAL: Hooks MUST run unconditionally before early `if (!material) return null;`!
  useEffect(() => {
    if (!material) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev && onSelectMaterial) {
        onSelectMaterial(list[currentIdx - 1]);
      }
      if (e.key === 'ArrowRight' && hasNext && onSelectMaterial) {
        onSelectMaterial(list[currentIdx + 1]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [material, onClose, hasPrev, hasNext, onSelectMaterial, list, currentIdx]);

  if (!material) return null;

  const liveLesson = resolveMaterialLessonInfo(material, COURSES);

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 backdrop-blur-xs ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-6'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white flex flex-col shadow-2xl border border-slate-200 overflow-hidden ${
          isFullscreen ? 'w-full h-full rounded-none' : 'rounded-2xl max-w-5xl w-full h-[88vh]'
        }`}
      >
        {/* Reader Header */}
        <div className="px-5 py-3.5 bg-[#0A192F] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-mono text-amber-400 flex flex-wrap items-center gap-x-2">
              <span>{material.courseCode}</span>
              <span aria-hidden="true">&middot;</span>
              <span>
                {isVi ? `Bài ${liveLesson.lessonOrder}` : `Lesson ${liveLesson.lessonOrder}`}:{' '}
                {isVi ? liveLesson.lessonTitleVi : liveLesson.lessonTitleEn}
              </span>
              <span aria-hidden="true">&middot;</span>
              <span className="tabular-nums">{material.fileSizeLabel}</span>
            </div>
            <h4 className="font-extrabold text-sm sm:text-base truncate mt-0.5">
              {isVi ? material.titleVi : material.titleEn}
            </h4>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {list.length > 1 && onSelectMaterial && (
              <div className="flex items-center gap-1 mr-1">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onSelectMaterial(list[currentIdx - 1])}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-white cursor-pointer"
                  title={isVi ? 'Học liệu trước' : 'Previous Material'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 px-1 tabular-nums">
                  {currentIdx + 1}/{list.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => hasNext && onSelectMaterial(list[currentIdx + 1])}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-white cursor-pointer"
                  title={isVi ? 'Học liệu tiếp theo' : 'Next Material'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {onOpenLesson && (
              <button
                type="button"
                onClick={() => onOpenLesson(material)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>{isVi ? 'Mở Bài Học' : 'Open Lesson'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => downloadLessonMaterial(material)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isVi ? 'Tải Xuống' : 'Download'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              title={isFullscreen ? (isVi ? 'Thu nhỏ' : 'Exit Fullscreen') : (isVi ? 'Toàn màn hình' : 'Fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              title={isVi ? 'Đóng' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Body */}
        <div className="flex-1 bg-slate-100 overflow-hidden p-2 sm:p-4">
          <LessonMaterialContentRenderer material={material} isVi={isVi} />
        </div>
      </div>
    </div>
  );
};
