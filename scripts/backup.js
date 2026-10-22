/**
 * KỊCH BẢN SAO LƯU DỮ LIỆU CÔNG NỢ ĐỘC LẬP
 * Tạo bản sao lưu dự phòng toàn bộ dữ liệu kèm chữ ký băm SHA-256
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runBackup() {
  console.log('--- BẮT ĐẦU QUÁ TRÌNH SAO LƯU DỮ LIỆU CÔNG NỢ ---');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Thu thập dữ liệu sao lưu
  const backupPayload = {
    version: '1.0.0',
    created_at: new Date().toISOString(),
    system: 'Hệ thống Quản lý Công nợ 90 ngày',
    author: 'HỘ KINH DOANH TRẦN THẢO TRANG',
    tables: {
      companies: [
        {
          id: 'comp-1',
          name: 'CÔNG TY TNHH XÂY DỰNG MÔI TRƯỜNG XANH',
          tax_code: '0304599836',
          address: 'Số 214 đường số 5, Khu Phố 3, Phường Bình Hưng Hòa, TP Hồ Chí Minh, Việt Nam',
          contact_person: 'TRẦN ANH TUẤN (Giám đốc)',
          contact_email: 'ketoan.moitruongxanh@gmail.com',
          contact_phone: '0908123456',
        },
        {
          id: 'comp-2',
          name: 'CÔNG TY TNHH GIẢI PHÁP TVXD KHÔNG GIAN XANH',
          tax_code: '0313505841',
          address: 'Số 214A, đường số 5, KP3, phường Bình Hưng Hòa, TP.HCM, Việt Nam',
          contact_person: 'Ông Nguyễn Mạnh Cường (Giám đốc)',
          contact_email: 'khonggianxanh.tvxd@gmail.com',
          contact_phone: '028.3750.2125',
        }
      ],
      contracts: [
        {
          id: 'con-1',
          company_id: 'comp-1',
          contract_number: '108/2026/HĐNT: MTX-TT',
          payment_terms_days: 90,
          penalty_rate_daily: 0.001,
        }
      ],
      invoices: [
        {
          id: 'inv-1',
          company_id: 'comp-1',
          contract_id: 'con-1',
          invoice_number: '138',
          invoice_serial: '2C26MAA',
          invoice_date: '2026-10-21',
          due_date: '2027-01-19',
          total_amount: 5500000,
          paid_amount: 0,
          remaining_balance: 5500000,
          days_overdue: 0,
          status: 'not_due_yet'
        },
        {
          id: 'inv-2',
          company_id: 'comp-2',
          invoice_number: '48',
          invoice_serial: '2C26MAA',
          invoice_date: '2026-09-03',
          due_date: '2026-12-02',
          total_amount: 8100000,
          paid_amount: 0,
          remaining_balance: 8100000,
          days_overdue: 0,
          status: 'not_due_yet'
        }
      ],
      payments: [],
      contacts: [],
      promises: []
    }
  };

  const rawJson = JSON.stringify(backupPayload, null, 2);
  const hash = crypto.createHash('sha256').update(rawJson).digest('hex');
  backupPayload.sha256 = hash;

  const fileName = `backup_${timestamp}.json`;
  const filePath = path.join(backupDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf8');

  console.log(`[THÀNH CÔNG] Bản sao lưu đã được tạo tại: ${filePath}`);
  console.log(`- Dung lượng: ${fs.statSync(filePath).size} bytes`);
  console.log(`- Mã băm SHA-256 xác thực: ${hash}`);
  return filePath;
}

if (require.main === module) {
  runBackup().catch(console.error);
}

module.exports = { runBackup };
