import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SiteGeneralSettings } from '../../types';
import { Save, QrCode, Globe, ShieldAlert, CheckCircle2 } from 'lucide-react';

const VN_BANKS = [
  { bin: '970436', name: 'Vietcombank (VCB)' },
  { bin: '970422', name: 'MB Bank (MB)' },
  { bin: '970407', name: 'Techcombank (TCB)' },
  { bin: '970415', name: 'VietinBank (ICB)' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970423', name: 'TPBank' },
  { bin: '970403', name: 'Sacombank' },
  { bin: '970448', name: 'OCB' },
  { bin: '970437', name: 'HDBank' },
  { bin: '970405', name: 'Agribank' },
];

export const AdminSiteSettingsTab: React.FC = () => {
  const { siteAdminConfig, saveSiteAdminConfig, language } = useApp();
  const isVi = language === 'vi';

  const [form, setForm] = useState<SiteGeneralSettings>(siteAdminConfig.general);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(siteAdminConfig.general);
  }, [siteAdminConfig.general]);

  const previewQrUrl = `https://img.vietqr.io/image/${encodeURIComponent(
    form.vietQrBankBin || '970436'
  )}-${encodeURIComponent(
    (form.vietQrAccountNo || '0071001288688').trim()
  )}-compact2.png?amount=100000&addInfo=${encodeURIComponent(
    'TEST FC ACADEMY'
  )}&accountName=${encodeURIComponent((form.vietQrAccountName || 'FC LEARNING ACADEMY').trim())}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSiteAdminConfig(
        (prev) => ({
          ...prev,
          general: {
            ...form,
            vietQrAccountNo: form.vietQrAccountNo.trim(),
            vietQrAccountName: form.vietQrAccountName.trim().toUpperCase(),
          },
        }),
        isVi
          ? 'Đã lưu cấu hình Website & Tài khoản nhận tiền VietQR!'
          : 'Saved Website Settings & VietQR Bank Account!'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5 text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Branding + Policies */}
        <div className="lg:col-span-7 space-y-5">
          {/* Branding */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{isVi ? 'Thông Tin Thương Hiệu & Hỗ Trợ Website' : 'Website Branding & Support Info'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Tên Học Viện / Website' : 'Site Name'}</label>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Hotline / Zalo Hỗ Trợ' : 'Support Hotline'}</label>
                <input
                  type="text"
                  value={form.supportHotline}
                  onChange={(e) => setForm({ ...form, supportHotline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Khẩu hiệu (Tiếng Việt)' : 'Tagline (VI)'}</label>
                <input
                  type="text"
                  value={form.taglineVi}
                  onChange={(e) => setForm({ ...form, taglineVi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Email hỗ trợ' : 'Support Email'}</label>
                <input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Operational & Maintenance Controls */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>{isVi ? 'Chính Sách Vận Hành & Kiểm Duyệt' : 'Governance & Operations Policy'}</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requireMaterialApproval}
                  onChange={(e) => setForm({ ...form, requireMaterialApproval: e.target.checked })}
                  className="mt-0.5 accent-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    {isVi ? 'Bật kiểm duyệt tài liệu học tập trước khi công khai' : 'Require pre-publish material approval'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isVi
                      ? 'Tài liệu do giảng viên / L&D tải lên sẽ vào hàng đợi Duyệt Tài Liệu cho tới khi Super Admin phê duyệt.'
                      : 'Materials uploaded by non-super-admins enter the approval queue before learners can view them.'}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.maintenanceMode}
                  onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                  className="mt-0.5 accent-rose-600"
                />
                <div className="flex-1 space-y-2">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {isVi ? 'Hiển thị thông báo bảo trì hệ thống toàn trang' : 'Display Global Maintenance Banner'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isVi
                        ? 'Hiển thị dải cảnh báo bảo trì nổi bật cho tất cả người dùng đang truy cập.'
                        : 'Shows a prominent maintenance banner across the entire web application.'}
                    </span>
                  </div>
                  {form.maintenanceMode && (
                    <input
                      type="text"
                      value={form.maintenanceMessageVi}
                      onChange={(e) => setForm({ ...form, maintenanceMessageVi: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-rose-300 bg-white text-rose-900 font-medium"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Receiving VietQR Bank Account Config + Live QR Preview */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>{isVi ? 'Tài Khoản Ngân Hàng Nhận Tiền VietQR' : 'VietQR Receiving Bank Account'}</span>
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {isVi
              ? 'Toàn bộ mã QR sinh ra khi học viên Ghi danh khóa học hoặc mua Combo sẽ tự động dùng tài khoản ngân hàng này.'
              : 'All QR codes generated during single-course or combo checkout automatically use this receiving account.'}
          </p>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Ngân hàng nhận tiền' : 'Bank'}</label>
              <select
                value={form.vietQrBankBin}
                onChange={(e) => setForm({ ...form, vietQrBankBin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
              >
                {VN_BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name} (BIN {b.bin})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Số tài khoản ngân hàng' : 'Account Number'}</label>
              <input
                type="text"
                required
                value={form.vietQrAccountNo}
                onChange={(e) => setForm({ ...form, vietQrAccountNo: e.target.value })}
                placeholder="0071001288688"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {isVi ? 'Tên chủ tài khoản (Không dấu, IN HOA)' : 'Account Holder Name (UPPERCASE)'}
              </label>
              <input
                type="text"
                required
                value={form.vietQrAccountName}
                onChange={(e) => setForm({ ...form, vietQrAccountName: e.target.value.toUpperCase() })}
                placeholder="TRAN CHANH TRUNG"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono uppercase"
              />
            </div>
          </div>

          {/* Live VietQR Verification Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isVi ? 'Xem trước mã VietQR mẫu (100.000đ)' : 'Live VietQR Test Preview (100,000 VND)'}</span>
            </span>
            <img
              src={previewQrUrl}
              alt="VietQR Preview"
              className="w-44 h-44 object-contain rounded-xl bg-white p-1.5 border border-slate-200"
            />
            <span className="text-[10px] text-slate-500">
              {isVi ? 'Bạn có thể dùng app ngân hàng quét thử để kiểm tra đúng tên chủ tài khoản.' : 'Scan with any banking app to verify account details.'}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>
              {saving
                ? isVi
                  ? 'Đang lưu cấu hình...'
                  : 'Saving settings...'
                : isVi
                ? 'Lưu Toàn Bộ Cấu Hình Website'
                : 'Save Website Settings'}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
};
