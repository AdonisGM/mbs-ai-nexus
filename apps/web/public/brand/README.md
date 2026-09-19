# Tài sản thương hiệu MSB

Tải về từ website chính thức của MSB, giữ nguyên bản gốc, không sửa.

| Tệp | Nguồn | Dùng ở đâu |
|---|---|---|
| `msb-logo-white.svg` | `msb.com.vn/.../package_images/logo_white.svg` | Bản gốc của component `MsbLogo` |
| `msb-logo-black.svg` | `msb.com.vn/.../package_images/logo_black.svg` | Dự phòng cho nền sáng, in ấn, slide |
| `../favicon.png` | `msb.com.vn/favicon.ico` (thực ra là PNG 150×150) | Icon trên tab trình duyệt |

## Vì sao giao diện không dùng thẳng mấy tệp này

`src/components/layout/msb-logo.tsx` nhúng thẳng SVG vào JSX, vì `<img>` không
thể thừa hưởng màu chữ xung quanh. Bản gốc vẽ chữ MSB bằng **trắng đặc** — trên
nền sáng là mất hút. Component đổi đúng phần chữ sang `currentColor` để nó theo
màu chữ của khung, còn biểu tượng giữ nguyên đỏ–cam của thương hiệu.

Ba tệp ở đây là **bản gốc chưa đụng tới**, để đối chiếu khi cần và để dùng cho
slide, tài liệu, bản in.

## Bản quyền

Đây là nhận diện của MSB, không phải tài sản của dự án. Dùng trong phạm vi bài
dự thi nội bộ. Không co kéo sai tỷ lệ, không đổi màu biểu tượng, không ghép
chữ khác vào thành một wordmark mới.
