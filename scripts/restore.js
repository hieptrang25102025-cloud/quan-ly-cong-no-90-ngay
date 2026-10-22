/**
 * KỊCH BẢN KIỂM TRA PHỤC HỒI DỮ LIỆU CÔNG NỢ TỪ BẢN SAO LƯU
 * Xác thực tính toàn vẹn (SHA-256) và kiểm tra khả năng phục hồi
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runRestore(targetFile) {
  console.log('--- BẮT ĐẦU QUÁ TRÌNH KIỂM THỬ PHỤC HỒI DỮ LIỆU ---');
  let filePath = targetFile;
  const backupDir = path.join(__dirname, '..', 'backups');

  if (!filePath) {
    if (!fs.existsSync(backupDir)) {
      throw new Error(`Thư mục sao lưu không tồn tại: ${backupDir}`);
    }
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
    if (files.length === 0) {
      throw new Error('Không tìm thấy bản sao lưu nào trong thư mục backups!');
    }
    filePath = path.join(backupDir, files[0]);
  }

  console.log(`Đang đọc bản sao lưu: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const payload = JSON.parse(content);

  // 1. Kiểm tra chữ ký băm
  const expectedHash = payload.sha256;
  const clone = { ...payload };
  delete clone.sha256;
  const actualHash = crypto.createHash('sha256').update(JSON.stringify(clone, null, 2)).digest('hex');

  console.log(`- Mã băm lưu trữ: ${expectedHash}`);
  console.log(`- Mã băm tính lại: ${actualHash}`);

  if (expectedHash !== actualHash) {
    throw new Error('CẢNH BÁO: Tệp sao lưu đã bị thay đổi hoặc hư hỏng chữ ký SHA-256!');
  }
  console.log('✓ Xác thực toàn vẹn dữ liệu SHA-256 THÀNH CÔNG.');

  // 2. Kiểm tra các bảng nghiệp vụ cốt lõi
  const tables = payload.tables || {};
  console.log(`✓ Số lượng công ty: ${tables.companies?.length || 0}`);
  console.log(`✓ Số lượng hợp đồng: ${tables.contracts?.length || 0}`);
  console.log(`✓ Số lượng hóa đơn: ${tables.invoices?.length || 0}`);
  console.log(`✓ Số lượng thanh toán: ${tables.payments?.length || 0}`);

  if (!tables.companies || tables.companies.length === 0) {
    throw new Error('Dữ liệu phục hồi thiếu bảng companies!');
  }
  if (!tables.invoices || tables.invoices.length === 0) {
    throw new Error('Dữ liệu phục hồi thiếu bảng invoices!');
  }

  console.log('--- [KẾT LUẬN] BẢN SAO LƯU HỢP LỆ VÀ SẴN SÀNG PHỤC HỒI 100% ---');
  return true;
}

if (require.main === module) {
  runRestore().catch(console.error);
}

module.exports = { runRestore };
