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
    revenue: 120_000_000_000,
    relationStage: 'Khách hàng lâu năm',
    currentProducts: ['Tài khoản thanh toán', 'Bảo lãnh'],
    attributes: { nhuCauVonKinhDoanh: 'Bảo lãnh dự thầu các gói đầu tư công' },
    signals: [
      { type: 'need', content: 'Sắp đấu thầu 2 gói, cần tăng hạn mức bảo lãnh', daysAgo: 8 },
    ],
  },
  {
    key: 'thanh_binh',
    name: 'Hộ kinh doanh Thanh Bình',
    contactName: 'Cô Bình',
    revenue: 9_500_000_000,
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    attributes: { phuongAnKinhDoanh: 'Tạp hoá bán buôn, chợ đầu mối' },
    signals: [
      { type: 'competition', content: 'Đang dùng tài khoản chính ở ngân hàng khác', daysAgo: 30 },
    ],
  },
  {
    key: 'an_khang',
    name: 'Công ty TNHH Dược phẩm An Khang',
    revenue: 62_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Thu hộ'],
    signals: [
      { type: 'cash_flow', content: 'Dòng tiền vào đều, chưa khai thác tín dụng', daysAgo: 16 },
    ],
  },
  {
    key: 'dong_tien',
    name: 'Công ty TNHH Cơ khí Đông Tiến',
    revenue: 35_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán'],
    signals: [
      { type: 'need', content: 'Muốn mua máy CNC mới, cần vay trung hạn', daysAgo: 5 },
    ],
  },
  {
    key: 'hoang_long',
    name: 'Công ty CP Thực phẩm Hoàng Long',
    revenue: 88_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Chi lương'],
    signals: [
      { type: 'product_gap', content: 'Chi lương qua MSB nhưng nhân viên mở thẻ nơi khác', daysAgo: 25 },
    ],
  },
  {
    key: 'viet_tin',
    name: 'Công ty TNHH Vận tải Việt Tín',
    revenue: 27_000_000_000,
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    signals: [
      { type: 'need', content: 'Cần vay mua 5 đầu kéo, hỏi lãi suất', daysAgo: 3 },
    ],
  },
  {
    key: 'nam_son',
    name: 'Hộ kinh doanh Nam Sơn',
    revenue: 6_200_000_000,
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    signals: [{ type: 'other', content: 'Chủ hộ còn e ngại thủ tục vay', daysAgo: 40 }],
  },
  {
    key: 'bao_ngoc',
    name: 'Công ty TNHH May Bảo Ngọc',
    revenue: 44_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Thanh toán quốc tế'],
    signals: [
      { type: 'competition', content: 'Ngân hàng khác chào phí thanh toán quốc tế thấp hơn', daysAgo: 11 },
    ],
  },
  {
    key: 'tan_phu',
    name: 'Công ty CP Nội thất Tân Phú',
    revenue: 19_000_000_000,
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán'],
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
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán'],
    attributes: { nguonTraNo: 'Lương 35 triệu/tháng' },
    signals: [{ type: 'need', content: 'Hỏi vay tiêu dùng 300 triệu sửa nhà', daysAgo: 6 }],
  },
  {
    key: 'quoc_dat',
    name: 'Lê Quốc Đạt',
    relationStage: 'Đang làm hồ sơ',
    currentProducts: ['Tài khoản thanh toán', 'Thẻ tín dụng'],
    attributes: {
      mucDichVay: 'Mua ô tô',
      taiSanBaoDam: 'Chính chiếc xe mua',
      nguonTraNo: 'Kinh doanh tự do',
    },
    signals: [
      { type: 'documents', content: 'Chưa chứng minh được thu nhập kinh doanh', daysAgo: 9 },
    ],
  },
  {
    key: 'mai_anh',
    name: 'Phạm Mai Anh',
    relationStage: 'Khách hàng lâu năm',
    currentProducts: ['Tài khoản thanh toán', 'Tiết kiệm'],
    signals: [{ type: 'need', content: 'Sổ tiết kiệm 1,5 tỷ sắp đáo hạn', daysAgo: 4 }],
  },
  {
    key: 'tuan_kiet',
    name: 'Võ Tuấn Kiệt',
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    signals: [{ type: 'competition', content: 'Đang vay mua nhà ở ngân hàng khác', daysAgo: 22 }],
  },
  {
    key: 'ngoc_lan',
    name: 'Đỗ Ngọc Lan',
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Thẻ ghi nợ'],
    signals: [{ type: 'need', content: 'Muốn mở thẻ tín dụng hạn mức cao', daysAgo: 13 }],
  },
  {
    key: 'hong_son',
    name: 'Bùi Hồng Sơn',
    relationStage: 'Đang làm hồ sơ',
    currentProducts: ['Tài khoản thanh toán'],
    attributes: { mucDichVay: 'Mua đất nền', taiSanBaoDam: 'Sổ đỏ nhà đang ở' },
    signals: [{ type: 'documents', content: 'Sổ đỏ đang thế chấp nơi khác', daysAgo: 19 }],
  },
  {
    key: 'kim_dung',
    name: 'Nguyễn Kim Dung',
    relationStage: 'Khách hàng lâu năm',
    currentProducts: ['Tài khoản thanh toán', 'Tiết kiệm', 'Bảo hiểm'],
    signals: [{ type: 'other', content: 'Giới thiệu thêm hai người thân mở tài khoản', daysAgo: 28 }],
  },
  {
    key: 'anh_tuan',
    name: 'Hoàng Anh Tuấn',
    relationStage: 'Mới tiếp cận',
    currentProducts: [],
    signals: [{ type: 'need', content: 'Hỏi vay kinh doanh nhỏ 500 triệu', daysAgo: 2 }],
  },
  {
    key: 'thanh_thuy',
    name: 'Vũ Thanh Thuỷ',
    relationStage: 'Đang giao dịch',
    currentProducts: ['Tài khoản thanh toán', 'Chi lương'],
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
