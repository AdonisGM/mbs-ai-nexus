import type { ActionName } from '../opportunities/transitions'

/** Stand-in data for the trial run.
 *
 *  Invented, and deliberately so: the brief rules out touching real customer
 *  records. It is shaped to be replaced — when the salespeople hand over their
 *  own twenty files, only this file changes.
 *
 *  The numbers are plausible for a branch: retail mortgages in the one-to-four
 *  billion range, small-business facilities a little larger, turnover figures
 *  that make the segment recognisable at a glance. */

export type SeedSignal = {
  type: string
  content: string
  /** Days before today. Signals are dated by when they were observed, not by
   *  when anyone typed them up. */
  daysAgo: number
  rawNote?: string
}

export type SeedCustomer = {
  key: string
  name: string
  contactName?: string
  contactPhone?: string
  revenue?: number
  relationStage?: string
  currentProducts?: string[]
  attributes?: Record<string, unknown>
  note?: string
  signals: SeedSignal[]
}

export type SeedDeal = {
  customer: string
  product: string
  need: string
  value: number
  stage: string
  winProbability?: number
  blockerCode?: string
  blockerNote?: string
  nextAction?: string
  supportNeeded?: string
  missingInfo?: string[]
  confirmedData?: Record<string, unknown>
  /** Days from today; negative is already past, which is what an overdue deal
   *  looks like on a team lead's screen. */
  dueInDays?: number
  /** The moves this deal has been through, replayed in order through the real
   *  service so the trace, the timings and the send-backs are genuine rather
   *  than written straight into the table. */
  script: Array<{ action: ActionName; reason?: string; body?: Record<string, unknown> }>
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hà — small businesses and household traders
 * ────────────────────────────────────────────────────────────────────────── */

export const SSE_CUSTOMERS: SeedCustomer[] = [
  {
    /** The scenario the brief walks through: money is coming in, and leaving
     *  again for another bank. */
    key: 'ha_an',
    name: 'Công ty TNHH Thương mại Hà An',
    contactName: 'Chị Hà',
    contactPhone: '0901234567',
    revenue: 48_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán'],
    attributes: {
      doanhSoTienVao: 48_000_000_000,
      tyLeChuyenSangNHKhac: '65%',
      mucDoDungSanPhamMSB: 'Chỉ dùng tài khoản thanh toán',
      nhuCauVonKinhDoanh: 'Nhập hàng theo mùa, cần vốn lưu động quý IV',
      phuongAnKinhDoanh: 'Phân phối hàng tiêu dùng, 3 kho tại Hà Nội',
    },
    signals: [
      {
        type: 'cash_flow',
        content: 'Tiền về tài khoản MSB xong chuyển ngay 65% sang ngân hàng khác',
        daysAgo: 21,
      },
      {
        type: 'product_gap',
        content: 'Chưa dùng sản phẩm tín dụng nào của MSB',
        daysAgo: 21,
      },
      {
        type: 'need',
        content: 'Cần vốn lưu động khoảng 5 tỷ cho mùa cao điểm quý IV',
        daysAgo: 12,
        rawNote:
          'Gặp chị Hà sáng nay. Chị nói quý IV nhập hàng nhiều, cần khoảng 5 tỷ vốn lưu động, đang cân nhắc vay ở đâu.',
      },
    ],
  },
  {
    key: 'minh_phat',
    name: 'Công ty CP Xây dựng Minh Phát',
    contactName: 'Anh Phát',
    contactPhone: '0908334455',
    revenue: 120_000_000_000,
    relationStage: 'Khách hàng lâu năm',
    currentProducts: ['Tài khoản thanh toán', 'Bảo lãnh'],
    attributes: {
      doanhSoTienVao: 120_000_000_000,
      tyLeChuyenSangNHKhac: '25%',
      mucDoDungSanPhamMSB: 'Tài khoản thanh toán và bảo lãnh',
      nhuCauVonKinhDoanh: 'Bảo lãnh dự thầu các gói đầu tư công',
      phuongAnKinhDoanh: 'Thi công hạ tầng, ba dự án đang triển khai',
    },
    signals: [
      { type: 'need', content: 'Sắp đấu thầu 2 gói, cần tăng hạn mức bảo lãnh', daysAgo: 8 },
    ],
  },
  {
    key: 'thanh_binh',
    name: 'Hộ kinh doanh Thanh Bình',
    contactName: 'Cô Bình',
    contactPhone: '0916552233',
    revenue: 9_500_000_000,
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    attributes: {
      doanhSoTienVao: 9_500_000_000,
      tyLeChuyenSangNHKhac: '95%',
      mucDoDungSanPhamMSB: 'Chưa dùng sản phẩm nào',
      nhuCauVonKinhDoanh: 'Xoay vòng vốn nhanh, chủ yếu dùng tiền mặt',
      phuongAnKinhDoanh: 'Tạp hoá bán buôn tại chợ đầu mối, hai sạp',
    },
    signals: [
      { type: 'competition', content: 'Đang dùng tài khoản chính ở ngân hàng khác', daysAgo: 30 },
    ],
  },
  {
    key: 'an_khang',
    name: 'Công ty TNHH Dược phẩm An Khang',
    contactName: 'Anh Khang',
    contactPhone: '0912456789',
    revenue: 62_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Thu hộ'],
    attributes: {
      doanhSoTienVao: 62_000_000_000,
      tyLeChuyenSangNHKhac: '30%',
      mucDoDungSanPhamMSB: 'Tài khoản thanh toán và thu hộ',
      nhuCauVonKinhDoanh: 'Nhập khẩu nguyên liệu, thanh toán theo LC',
      phuongAnKinhDoanh: 'Phân phối dược phẩm cho 40 nhà thuốc',
    },
    signals: [
      { type: 'cash_flow', content: 'Dòng tiền vào đều, chưa khai thác tín dụng', daysAgo: 16 },
    ],
  },
  {
    key: 'dong_tien',
    name: 'Công ty TNHH Cơ khí Đông Tiến',
    contactName: 'Anh Tiến',
    contactPhone: '0903221144',
    revenue: 35_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán'],
    attributes: {
      doanhSoTienVao: 35_000_000_000,
      tyLeChuyenSangNHKhac: '45%',
      mucDoDungSanPhamMSB: 'Chỉ dùng tài khoản thanh toán',
      nhuCauVonKinhDoanh: 'Đầu tư máy móc, vay trung hạn 3 năm',
      phuongAnKinhDoanh: 'Gia công cơ khí chính xác cho doanh nghiệp FDI',
    },
    signals: [
      { type: 'need', content: 'Muốn mua máy CNC mới, cần vay trung hạn', daysAgo: 5 },
    ],
  },
  {
    key: 'hoang_long',
    name: 'Công ty CP Thực phẩm Hoàng Long',
    contactName: 'Chị Loan, phòng nhân sự',
    contactPhone: '0988112233',
    revenue: 88_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Chi lương'],
    attributes: {
      doanhSoTienVao: 88_000_000_000,
      tyLeChuyenSangNHKhac: '20%',
      mucDoDungSanPhamMSB: 'Tài khoản thanh toán và chi lương 180 nhân viên',
      nhuCauVonKinhDoanh: 'Chưa có nhu cầu vay, quan tâm phúc lợi nhân viên',
      phuongAnKinhDoanh: 'Chế biến thực phẩm, hai nhà máy tại Hưng Yên',
    },
    signals: [
      { type: 'product_gap', content: 'Chi lương qua MSB nhưng nhân viên mở thẻ nơi khác', daysAgo: 25 },
    ],
  },
  {
    key: 'viet_tin',
    name: 'Công ty TNHH Vận tải Việt Tín',
    contactName: 'Anh Tín',
    contactPhone: '0906778899',
    revenue: 27_000_000_000,
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    attributes: {
      doanhSoTienVao: 27_000_000_000,
      tyLeChuyenSangNHKhac: '80%',
      mucDoDungSanPhamMSB: 'Chưa dùng sản phẩm nào',
      nhuCauVonKinhDoanh: 'Mở rộng đội xe, cần vay mua phương tiện',
      phuongAnKinhDoanh: 'Vận tải container tuyến Bắc - Nam, 12 đầu kéo',
    },
    signals: [
      { type: 'need', content: 'Cần vay mua 5 đầu kéo, hỏi lãi suất', daysAgo: 3 },
    ],
  },
  {
    key: 'nam_son',
    name: 'Hộ kinh doanh Nam Sơn',
    contactName: 'Anh Sơn',
    contactPhone: '0975334422',
    revenue: 6_200_000_000,
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    attributes: {
      doanhSoTienVao: 6_200_000_000,
      tyLeChuyenSangNHKhac: '90%',
      mucDoDungSanPhamMSB: 'Chưa dùng sản phẩm nào',
      nhuCauVonKinhDoanh: 'Cần vốn nhập hàng, nhưng ngại thủ tục',
      phuongAnKinhDoanh: 'Bán buôn vật liệu xây dựng, một kho tại Hà Đông',
    },
    signals: [{ type: 'other', content: 'Chủ hộ còn e ngại thủ tục vay', daysAgo: 40 }],
  },
  {
    key: 'bao_ngoc',
    name: 'Công ty TNHH May Bảo Ngọc',
    contactName: 'Chị Ngọc',
    contactPhone: '0913557799',
    revenue: 44_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Thanh toán quốc tế'],
    attributes: {
      doanhSoTienVao: 44_000_000_000,
      tyLeChuyenSangNHKhac: '55%',
      mucDoDungSanPhamMSB: 'Tài khoản thanh toán và thanh toán quốc tế',
      nhuCauVonKinhDoanh: 'Thanh toán cho đối tác nước ngoài, quan tâm phí',
      phuongAnKinhDoanh: 'May gia công xuất khẩu sang EU, 300 công nhân',
    },
    signals: [
      { type: 'competition', content: 'Ngân hàng khác chào phí thanh toán quốc tế thấp hơn', daysAgo: 11 },
    ],
  },
  {
    key: 'tan_phu',
    name: 'Công ty CP Nội thất Tân Phú',
    contactName: 'Anh Phú',
    contactPhone: '0982445566',
    revenue: 19_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán'],
    attributes: {
      doanhSoTienVao: 19_000_000_000,
      tyLeChuyenSangNHKhac: '40%',
      mucDoDungSanPhamMSB: 'Chỉ dùng tài khoản thanh toán',
      nhuCauVonKinhDoanh: 'Cần vốn lưu động nhưng báo cáo chưa kiểm toán',
      phuongAnKinhDoanh: 'Sản xuất nội thất theo đơn đặt hàng',
    },
    signals: [
      { type: 'documents', content: 'Báo cáo tài chính 2025 đã có, chưa kiểm toán', daysAgo: 18 },
    ],
  },
]

/* ──────────────────────────────────────────────────────────────────────────
 * Hải — individuals
 * ────────────────────────────────────────────────────────────────────────── */

export const RB_CUSTOMERS: SeedCustomer[] = [
  {
    /** The other scenario from the brief: a mortgage with a deadline, a
     *  competitor in the room, and the whole thing hanging on a rate. */
    key: 'van_minh',
    name: 'Nguyễn Văn Minh',
    revenue: 720_000_000,
    contactName: 'Anh Minh',
    contactPhone: '0987654321',
    relationStage: 'Đang làm hồ sơ',
    currentProducts: ['Tài khoản thanh toán', 'Thẻ ghi nợ'],
    attributes: {
      mucDichVay: 'Mua căn hộ 3,2 tỷ tại quận Nam Từ Liêm',
      taiSanBaoDam: 'Chính căn hộ mua, đã có hợp đồng mua bán',
      nguonTraNo: 'Lương 60 triệu/tháng, vợ kinh doanh thêm',
      tinhTrangPhapLy: 'Hồ sơ cơ bản đầy đủ',
      nganHangDangSoSanh: 'VCB, Techcombank',
    },
    signals: [
      {
        type: 'deadline',
        content: 'Phải giải ngân trước 30/9, nếu không mất cọc',
        daysAgo: 14,
        rawNote:
          'Anh Minh cần vay 2 tỷ trước ngày 30/9, đang so lãi suất với ngân hàng khác và chưa quyết định.',
      },
      { type: 'competition', content: 'VCB chào 7,9% năm đầu', daysAgo: 10 },
      { type: 'documents', content: 'Đã nộp sao kê lương 6 tháng', daysAgo: 7 },
    ],
  },
  {
    key: 'thu_ha',
    name: 'Trần Thu Hà',
    contactName: 'Chị Hà',
    contactPhone: '0935112244',
    revenue: 420_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán'],
    attributes: {
      mucDichVay: 'Sửa nhà, hoàn thiện tầng 3',
      taiSanBaoDam: 'Nhà đang ở, sổ đỏ chính chủ',
      nguonTraNo: 'Lương 35 triệu/tháng, thâm niên 8 năm',
      tinhTrangPhapLy: 'Hồ sơ đầy đủ',
      nganHangDangSoSanh: 'Chưa so sánh với ngân hàng nào',
    },
    signals: [{ type: 'need', content: 'Hỏi vay tiêu dùng 300 triệu sửa nhà', daysAgo: 6 }],
  },
  {
    key: 'quoc_dat',
    name: 'Lê Quốc Đạt',
    contactName: 'Anh Đạt',
    contactPhone: '0968223311',
    revenue: 600_000_000,
    relationStage: 'Đang làm hồ sơ',
    currentProducts: ['Tài khoản thanh toán', 'Thẻ tín dụng'],
    attributes: {
      mucDichVay: 'Mua ô tô phục vụ kinh doanh',
      taiSanBaoDam: 'Chính chiếc xe mua',
      nguonTraNo: 'Kinh doanh tự do, chưa chứng minh được bằng sao kê',
      tinhTrangPhapLy: 'Thiếu sao kê tài khoản kinh doanh',
      nganHangDangSoSanh: 'VPBank, MSB',
    },
    signals: [
      { type: 'documents', content: 'Chưa chứng minh được thu nhập kinh doanh', daysAgo: 9 },
    ],
  },
  {
    key: 'mai_anh',
    name: 'Phạm Mai Anh',
    contactName: 'Chị Mai Anh',
    contactPhone: '0904556677',
    revenue: 480_000_000,
    relationStage: 'Khách hàng lâu năm',
    currentProducts: ['Tài khoản thanh toán', 'Tiết kiệm'],
    attributes: {
      mucDichVay: 'Không vay, khách gửi tiết kiệm',
      nguonTraNo: 'Cho thuê hai căn hộ, thu 40 triệu/tháng',
      tinhTrangPhapLy: 'Khách lâu năm, hồ sơ đầy đủ',
      nganHangDangSoSanh: 'So lãi suất huy động với ba ngân hàng',
    },
    signals: [{ type: 'need', content: 'Sổ tiết kiệm 1,5 tỷ sắp đáo hạn', daysAgo: 4 }],
  },
  {
    key: 'tuan_kiet',
    name: 'Võ Tuấn Kiệt',
    contactName: 'Anh Kiệt',
    contactPhone: '0917889900',
    revenue: 540_000_000,
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    attributes: {
      mucDichVay: 'Chuyển khoản vay mua nhà từ ngân hàng khác về MSB',
      taiSanBaoDam: 'Căn nhà đang thế chấp tại ngân hàng cũ',
      nguonTraNo: 'Lương 45 triệu/tháng, vợ có thu nhập thêm',
      tinhTrangPhapLy: 'Chờ xác nhận dư nợ bên ngân hàng cũ',
      nganHangDangSoSanh: 'Ngân hàng đang vay, MSB',
    },
    signals: [{ type: 'competition', content: 'Đang vay mua nhà ở ngân hàng khác', daysAgo: 22 }],
  },
  {
    key: 'ngoc_lan',
    name: 'Đỗ Ngọc Lan',
    contactName: 'Chị Lan',
    contactPhone: '0942667788',
    revenue: 504_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Thẻ ghi nợ'],
    attributes: {
      mucDichVay: 'Không vay, cần hạn mức thẻ tín dụng',
      nguonTraNo: 'Lương 42 triệu/tháng qua tài khoản MSB',
      tinhTrangPhapLy: 'Hồ sơ đầy đủ',
      nganHangDangSoSanh: 'Đang dùng thẻ của hai ngân hàng khác',
    },
    signals: [{ type: 'need', content: 'Muốn mở thẻ tín dụng hạn mức cao', daysAgo: 13 }],
  },
  {
    key: 'hong_son',
    name: 'Bùi Hồng Sơn',
    contactName: 'Anh Sơn',
    contactPhone: '0983445511',
    revenue: 660_000_000,
    relationStage: 'Đang làm hồ sơ',
    currentProducts: ['Tài khoản thanh toán'],
    attributes: {
      mucDichVay: 'Mua đất nền tại Hoài Đức',
      taiSanBaoDam: 'Sổ đỏ nhà đang ở, đang thế chấp nơi khác',
      nguonTraNo: 'Lương 38 triệu/tháng và cho thuê một phòng trọ',
      tinhTrangPhapLy: 'Chờ xác nhận dư nợ tại ngân hàng đang thế chấp',
      nganHangDangSoSanh: 'Ngân hàng đang thế chấp, MSB',
    },
    signals: [{ type: 'documents', content: 'Sổ đỏ đang thế chấp nơi khác', daysAgo: 19 }],
  },
  {
    key: 'kim_dung',
    name: 'Nguyễn Kim Dung',
    contactName: 'Cô Dung',
    contactPhone: '0913228844',
    revenue: 360_000_000,
    relationStage: 'Khách hàng lâu năm',
    currentProducts: ['Tài khoản thanh toán', 'Tiết kiệm', 'Bảo hiểm'],
    attributes: {
      mucDichVay: 'Không vay, gửi tiết kiệm và mua bảo hiểm',
      nguonTraNo: 'Lương hưu và cho thuê mặt bằng',
      tinhTrangPhapLy: 'Khách lâu năm, hồ sơ đầy đủ',
      nganHangDangSoSanh: 'Trung thành với MSB',
    },
    signals: [{ type: 'other', content: 'Giới thiệu thêm hai người thân mở tài khoản', daysAgo: 28 }],
  },
  {
    key: 'anh_tuan',
    name: 'Hoàng Anh Tuấn',
    contactName: 'Anh Tuấn',
    contactPhone: '0961335577',
    revenue: 300_000_000,
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    attributes: {
      mucDichVay: 'Vốn mở cửa hàng điện máy',
      taiSanBaoDam: 'Chưa xác định, đang cân nhắc thế chấp nhà bố mẹ',
      nguonTraNo: 'Doanh thu cửa hàng dự kiến, chưa có lịch sử',
      tinhTrangPhapLy: 'Chưa nộp giấy tờ',
      nganHangDangSoSanh: 'Đang hỏi ba ngân hàng',
    },
    signals: [{ type: 'need', content: 'Hỏi vay kinh doanh nhỏ 500 triệu', daysAgo: 2 }],
  },
  {
    key: 'thanh_thuy',
    name: 'Vũ Thanh Thuỷ',
    contactName: 'Chị Thuỷ',
    contactPhone: '0929776655',
    revenue: 336_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Chi lương'],
    attributes: {
      mucDichVay: 'Không vay, cần thẻ tín dụng để chi tiêu',
      nguonTraNo: 'Lương 28 triệu/tháng, nhận qua MSB',
      tinhTrangPhapLy: 'Hồ sơ đầy đủ',
      nganHangDangSoSanh: 'Chưa mở thẻ ở đâu',
    },
    signals: [{ type: 'product_gap', content: 'Nhận lương qua MSB nhưng chưa dùng thẻ tín dụng', daysAgo: 15 }],
  },
]

/* ──────────────────────────────────────────────────────────────────────────
 * Deals
 * ────────────────────────────────────────────────────────────────────────── */

/** Spread across the ten states on purpose: a pipeline where everything sits
 *  in one place shows nothing. There is a deal waiting on each tier, one that
 *  was sent back and fixed, one overdue, one won and one lost — so every
 *  screen has something real to show the moment it is built. */
export const DEALS: SeedDeal[] = [
  {
    /** The walkthrough: confirmed, escalated over a rate, decided by the
     *  branch manager, and now back on the salesperson's desk. */
    customer: 'van_minh',
    product: 'Vay mua bất động sản',
    need: 'Mua căn hộ, cần giải ngân trước hạn hợp đồng',
    value: 2_000_000_000,
    stage: 'negotiation',
    blockerCode: 'rate',
    blockerNote: 'VCB chào 7,9% năm đầu, khách so sánh',
    dueInDays: 11,
    confirmedData: {
      nguonTraNo: 'Lương 60 triệu/tháng, đã có sao kê 6 tháng',
      taiSanBaoDam: 'Chính căn hộ mua',
    },
    script: [
      { action: 'confirm' },
      { action: 'view' },
      {
        action: 'escalate',
        reason: 'Khách yêu cầu lãi suất dưới biểu, vượt thẩm quyền nhóm',
      },
      {
        action: 'decide',
        body: {
          bmDecision: 'Duyệt ưu đãi 0,3% trong 12 tháng đầu, hiệu lực tới 30/9',
          nextAction: 'Báo khách mức lãi mới, chốt hồ sơ trước 30/9',
          winProbability: 90,
        },
      },
    ],
  },
  {
    /** Sent back and fixed — the loop the flow chart needs an example of. */
    customer: 'quoc_dat',
    product: 'Vay mua ô tô',
    need: 'Mua xe phục vụ kinh doanh',
    value: 750_000_000,
    stage: 'documentation',
    blockerCode: 'documents',
    blockerNote: 'Thu nhập kinh doanh chưa chứng minh được',
    dueInDays: 20,
    script: [
      { action: 'confirm' },
      { action: 'view' },
      {
        action: 'send_back',
        reason: 'Chưa rõ nguồn trả nợ thứ hai, cần bổ sung',
        body: { missingInfo: ['Sao kê tài khoản kinh doanh 12 tháng'] },
      },
      { action: 'confirm' },
    ],
  },
  {
    /** Waiting on the branch manager right now, so their screen is not empty. */
    customer: 'ha_an',
    product: 'Vay vốn lưu động',
    need: 'Bổ sung vốn nhập hàng mùa cao điểm quý IV',
    value: 5_000_000_000,
    stage: 'proposal',
    blockerCode: 'policy',
    blockerNote: 'Khách đề nghị miễn phí trả nợ trước hạn',
    dueInDays: 25,
    script: [
      { action: 'confirm' },
      { action: 'view' },
      { action: 'escalate', reason: 'Đề nghị miễn phí trả trước hạn, cần cơ chế' },
    ],
  },
  {
    /** Overdue and still with the salesperson. */
    customer: 'hong_son',
    product: 'Vay mua bất động sản',
    need: 'Mua đất nền',
    value: 1_400_000_000,
    stage: 'documentation',
    blockerCode: 'collateral',
    blockerNote: 'Sổ đỏ đang thế chấp tại ngân hàng khác',
    dueInDays: -4,
    missingInfo: ['Xác nhận dư nợ tại ngân hàng đang thế chấp'],
    script: [{ action: 'confirm' }, { action: 'view' }, { action: 'send_back', reason: 'Chờ xác nhận dư nợ bên kia' }],
  },
  {
    customer: 'minh_phat',
    product: 'Bảo lãnh dự thầu',
    need: 'Tăng hạn mức bảo lãnh cho hai gói thầu',
    value: 8_000_000_000,
    stage: 'negotiation',
    blockerCode: 'speed',
    blockerNote: 'Khách cần phát hành trong 3 ngày',
    dueInDays: 3,
    script: [{ action: 'confirm' }, { action: 'view' }, { action: 'coach' }],
  },
  {
    customer: 'thu_ha',
    product: 'Vay tiêu dùng',
    need: 'Sửa nhà',
    value: 300_000_000,
    stage: 'proposal',
    dueInDays: 14,
    script: [{ action: 'confirm' }],
  },
  {
    customer: 'mai_anh',
    product: 'Tiết kiệm',
    need: 'Tái tục sổ đáo hạn',
    value: 1_500_000_000,
    stage: 'closing',
    dueInDays: 6,
    script: [
      { action: 'confirm' },
      { action: 'view' },
      { action: 'complete', reason: 'Khách tái tục toàn bộ, kỳ hạn 12 tháng' },
    ],
  },
  {
    /** A loss with its reason, so the blocker view has something to group. */
    customer: 'tuan_kiet',
    product: 'Vay mua bất động sản',
    need: 'Chuyển khoản vay từ ngân hàng khác về MSB',
    value: 2_600_000_000,
    stage: 'negotiation',
    blockerCode: 'rate',
    blockerNote: 'Ngân hàng cũ giữ khách bằng lãi suất thấp hơn',
    dueInDays: -12,
    script: [
      { action: 'confirm' },
      { action: 'view' },
      { action: 'close', reason: 'Ngân hàng cũ giảm lãi để giữ khách' },
    ],
  },
  {
    customer: 'dong_tien',
    product: 'Vay trung hạn',
    need: 'Mua máy CNC',
    value: 3_200_000_000,
    stage: 'discovery',
    dueInDays: 30,
    script: [{ action: 'confirm' }],
  },
  {
    customer: 'viet_tin',
    product: 'Vay mua phương tiện',
    need: 'Mua 5 đầu kéo',
    value: 6_500_000_000,
    stage: 'discovery',
    blockerCode: 'rate',
    blockerNote: 'Khách so lãi suất với ngân hàng khác',
    dueInDays: 18,
    script: [{ action: 'confirm' }],
  },
  {
    /** Still a private draft, so the first gate has something behind it. */
    customer: 'anh_tuan',
    product: 'Vay kinh doanh',
    need: 'Vốn mở cửa hàng',
    value: 500_000_000,
    stage: 'prospecting',
    dueInDays: 21,
    missingInfo: ['Phương án kinh doanh', 'Nguồn trả nợ'],
    script: [],
  },
  {
    customer: 'bao_ngoc',
    product: 'Thanh toán quốc tế',
    need: 'Chuyển doanh số thanh toán quốc tế về MSB',
    value: 4_000_000_000,
    stage: 'proposal',
    blockerCode: 'competitor',
    blockerNote: 'Ngân hàng khác chào phí thấp hơn',
    dueInDays: 16,
    script: [{ action: 'confirm' }, { action: 'view' }],
  },
  {
    customer: 'ngoc_lan',
    product: 'Thẻ tín dụng',
    need: 'Hạn mức 200 triệu',
    value: 200_000_000,
    stage: 'documentation',
    dueInDays: 9,
    script: [{ action: 'confirm' }, { action: 'view' }, { action: 'coach' }],
  },
  {
    customer: 'hoang_long',
    product: 'Gói chi lương',
    need: 'Mở thẻ cho 180 nhân viên',
    value: 1_800_000_000,
    stage: 'proposal',
    blockerCode: 'experience',
    blockerNote: 'Nhân viên phàn nàn thủ tục mở thẻ chậm',
    dueInDays: 27,
    script: [{ action: 'confirm' }, { action: 'view' }, { action: 'escalate', reason: 'Cần bố trí quầy lưu động tại nhà máy' }],
  },
  {
    customer: 'thanh_thuy',
    product: 'Thẻ tín dụng',
    need: 'Hạn mức 100 triệu',
    value: 100_000_000,
    stage: 'closing',
    dueInDays: 2,
    script: [
      { action: 'confirm' },
      { action: 'view' },
      { action: 'complete', reason: 'Đã phát hành thẻ, khách kích hoạt' },
    ],
  },
]

/** Placeholder allocations for the quarter. Replace once the branch manager
 *  confirms the real ones — every figure on their screen is a subtraction from
 *  these, so they are the first thing worth checking. */
export const PERIOD = '2026-Q3'

export const TARGETS = {
  unit: 40_000_000_000,
  sse: 24_000_000_000,
  rb: 16_000_000_000,
  saleSse: 12_000_000_000,
  saleRb: 8_000_000_000,
}
