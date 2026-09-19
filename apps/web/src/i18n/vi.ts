/** Every word the user reads, in one place.
 *
 *  The API speaks codes — `sale`, `escalated_to_bm`, `invalid_credentials` —
 *  and this turns them into Vietnamese. Keeping the whole vocabulary here is
 *  what makes another language a second file rather than a sweep through the
 *  screens, and it is why no component is allowed to type a Vietnamese string
 *  inline.
 *
 *  Keys are named after the domain, not the screen: `opportunity.status.x`
 *  rather than `leadPage.label3`. Screens get rearranged; the domain does not. */
export const vi = {
  'app.name': 'MSB AI Nexus',
  /** Just the product half, for where the bank's own mark sits beside it. */
  'app.product': 'AI Nexus',
  'app.tagline': 'Nền tảng AI điều hành bán hàng đa tầng',

  'nav.today': 'Việc hôm nay',
  'nav.customers': 'Khách hàng',
  'nav.opportunities': 'Cơ hội',
  'nav.team': 'Nhóm của tôi',
  'nav.unit': 'Đơn vị',
  'nav.targets': 'Chỉ tiêu',
  'nav.settings': 'Cài đặt',
  'nav.openMenu': 'Mở menu',
  'nav.closeMenu': 'Đóng menu',

  'app.copyright': '© 2026 MSB AI Nexus',

  'theme.light': 'Sáng',
  'theme.dark': 'Tối',
  'theme.toLight': 'Chuyển nền sáng',
  'theme.toDark': 'Chuyển nền tối',

  'auth.welcome': 'Chào mừng bạn quay lại',
  'auth.welcomeNote':
    'Khách hàng, cơ hội và việc cần làm hôm nay của bạn vẫn ở đây. Đăng nhập để xem tiếp.',
  'auth.cardTitle': 'Đăng nhập bằng tài khoản',
  'auth.cardNote':
    'Dùng mã tài khoản được cấp và mật khẩu của bạn. Hệ thống chưa mở đăng nhập bằng thiết bị.',
  'auth.codePlaceholder': 'SALE-RB-01',
  'auth.forgot': 'Quên mật khẩu',
  'auth.contactAdmin': 'Liên hệ quản trị',
  'auth.issuedNote':
    'Tài khoản do quản trị hệ thống cấp, không tự đăng ký. Bản chạy thử mở cho năm tài khoản vận hành của đội AI Nexus.',
  'auth.signIn': 'Đăng nhập',
  'auth.signOut': 'Đăng xuất',
  'auth.code': 'Mã tài khoản',
  'auth.password': 'Mật khẩu',
  'auth.signingIn': 'Đang đăng nhập…',

  'role.sale': 'Nhân viên kinh doanh',
  'role.team_lead': 'Trưởng nhóm',
  'role.bm': 'Giám đốc đơn vị',
  'role.admin': 'Quản trị hệ thống',

  'segment.sse': 'Khách hàng doanh nghiệp SSE',
  'segment.rb': 'Khách hàng cá nhân',
  'segment.sse.short': 'SSE',
  'segment.rb.short': 'Cá nhân',

  'level.cv1': 'Chuyên viên bậc 1',
  'level.cv2': 'Chuyên viên bậc 2',
  'level.cv3': 'Chuyên viên bậc 3',
  'level.cvc': 'Chuyên viên chính',
  'level.tn': 'Trưởng nhóm',
  'level.gd': 'Giám đốc',

  /** The customer's journey. */
  'stage.prospecting': 'Tiếp cận',
  'stage.discovery': 'Khai thác nhu cầu',
  'stage.proposal': 'Đề xuất',
  'stage.negotiation': 'Đàm phán',
  'stage.documentation': 'Hồ sơ',
  'stage.closing': 'Chốt',

  /** How far the paperwork has come inside MSB. Nobody picks one of these from
   *  a list — they are the consequence of pressing a button. */
  'status.ai_drafted': 'AI mới đề xuất',
  'status.sale_reviewing': 'Nhân viên đang xem xét',
  'status.sale_confirmed': 'Nhân viên đã xác nhận',
  'status.lead_viewed': 'Trưởng nhóm đã xem',
  'status.lead_returned': 'Trưởng nhóm yêu cầu bổ sung',
  'status.lead_approved': 'Trưởng nhóm đã xác nhận',
  'status.escalated_to_bm': 'Đã chuyển giám đốc',
  'status.bm_decided': 'Giám đốc đã quyết định',
  'status.completed': 'Đã hoàn thành',
  'status.closed_lost': 'Đã đóng, không thành công',

  /** The buttons. */
  'action.confirm': 'Xác nhận',
  'action.view': 'Đã xem',
  'action.send_back': 'Trả lại',
  'action.coach': 'Duyệt hướng xử lý',
  'action.escalate': 'Chuyển giám đốc',
  'action.decide': 'Quyết định',
  'action.complete': 'Hoàn thành',
  'action.close': 'Đóng, không thành công',

  'blocker.rate': 'Lãi suất',
  'blocker.speed': 'Tốc độ xử lý',
  'blocker.experience': 'Trải nghiệm',
  'blocker.documents': 'Hồ sơ',
  'blocker.collateral': 'Tài sản bảo đảm',
  'blocker.policy': 'Cơ chế, chính sách',
  'blocker.competitor': 'Ngân hàng khác',
  'blocker.customer_hesitation': 'Khách còn do dự',
  'blocker.other': 'Khác',

  'signal.cash_flow': 'Dòng tiền',
  'signal.product_gap': 'Thiếu sản phẩm',
  'signal.need': 'Nhu cầu',
  'signal.competition': 'Cạnh tranh',
  'signal.deadline': 'Thời hạn',
  'signal.documents': 'Hồ sơ',
  'signal.other': 'Khác',

  'outcome.open': 'Đang mở',
  'outcome.won': 'Thành công',
  'outcome.lost': 'Không thành công',

  'field.value': 'Giá trị cơ hội',
  'field.stage': 'Giai đoạn',
  'field.dueDate': 'Thời hạn',
  'field.winProbability': 'Xác suất',
  'field.owner': 'Phụ trách',
  'field.nextAction': 'Hành động tiếp theo',
  'field.blocker': 'Điểm nghẽn',
  'field.customer': 'Khách hàng',
  'field.product': 'Sản phẩm',
  'field.need': 'Nhu cầu',

  'common.all': 'Tất cả',
  'common.search': 'Tìm kiếm',

  'customers.searchPlaceholder': 'Tìm theo tên hoặc mã khách hàng',
  'customers.empty': 'Chưa có khách hàng nào',
  'customers.noMatch': 'Không tìm thấy khách hàng nào khớp',
  /** Ai đang xem quyết định thấy được gì, nên màn hình nói thẳng ra thay vì
   *  để người ta tự hỏi sao danh sách của đồng nghiệp lại dài hơn. */
  'customers.scope.sale': 'Khách hàng bạn đang phụ trách',
  'customers.scope.team_lead': 'Khách hàng của các nhân viên bạn quản lý',
  'customers.scope.bm': 'Toàn bộ khách hàng của đơn vị',
  'customers.scope.admin': 'Toàn bộ khách hàng, mọi đơn vị',
  'common.overdue': 'Quá hạn',
  'common.dueToday': 'Đến hạn hôm nay',
  'common.noDeadline': 'Chưa có hạn',
  'common.empty': 'Chưa có dữ liệu',
  'common.retry': 'Thử lại',
  'common.loading': 'Đang tải…',

  /** Error codes as the API sends them. A code with no entry here falls
   *  through to a generic line rather than showing the raw code, which is
   *  meaningless to a salesperson. */
  'error.invalid_credentials': 'Mã tài khoản hoặc mật khẩu không đúng',
  'error.not_authenticated': 'Phiên đã hết hạn, vui lòng đăng nhập lại',
  'error.forbidden': 'Bạn không có quyền thực hiện việc này',
  'error.customer_not_found': 'Không tìm thấy khách hàng',
  'error.opportunity_not_found': 'Không tìm thấy cơ hội',
  'error.reason_required': 'Cần nhập lý do',
  'error.action_not_allowed_for_role': 'Việc này không thuộc quyền của bạn',
  'error.action_not_allowed_from_status': 'Cơ hội đã chuyển trạng thái, vui lòng tải lại',
  'error.opportunity_is_closed': 'Cơ hội đã đóng',
  'error.owner_out_of_scope': 'Người phụ trách không thuộc phạm vi quản lý của bạn',
  'error.owner_segment_mismatch': 'Người phụ trách không phụ trách phân khúc này',
  'error.only_bm_sets_targets': 'Chỉ giám đốc đơn vị đặt được chỉ tiêu',
  'error.unexpected_response': 'Máy chủ không phản hồi đúng',
  'error.unknown': 'Có lỗi xảy ra, vui lòng thử lại',
} satisfies Record<string, string>

export type Dict = typeof vi
export type DictKey = keyof Dict
