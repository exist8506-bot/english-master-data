# English Master — rà soát ngữ cảnh từ vựng và câu mẫu

Ngày rà soát: 28/10/2026  
Nhánh rà soát: `context-review-2026-10-28`  
Phiên bản dữ liệu gốc: 8.1.1 (dữ liệu hiện trạng từ `main` trước khi sửa).

## Phạm vi

- `data/vocabulary.json`: 3,500 mục từ; giữ nguyên số lượng và ID.
- `data/sentences.json`: 3,750 câu luyện tập/hội thoại; giữ nguyên số lượng và ID.
- Gói `expansion500_v2`: sửa nghĩa tiếng Việt rõ ràng sai và thay placeholder từ loại `word` bằng từ loại dùng trong câu ví dụ.
- Các mục không có lỗi rõ ràng được giữ nguyên; không thêm thời gian hoặc địa điểm giả tạo chỉ để đủ mẫu. Khi hợp lý, câu sửa có thêm thời điểm, nơi chốn, hành động/đối tượng để người học hiểu cách dùng.

## Những thay đổi đã thực hiện

- Tổng số bản ghi thay đổi: 1,653.
- Bản ghi từ vựng có ví dụ/nghĩa/từ loại được chỉnh: 852 mục từ.
- Câu luyện tập được căn chỉnh với ví dụ từ vựng: 438 bản ghi.
- Câu mẫu sửa thủ công ưu tiên các trường hợp động từ thiếu đối tượng, cụm từ bị ghép máy móc, từ loại/ngữ cảnh không khớp, hoặc thời gian/địa điểm gây hiểu sai.
- Sửa các nghĩa tiếng Việt rõ ràng sai như `left`, `invite`, `cave`, `tap`, `rocket`, `swallow`, `elevator`, `waterfall`, `landlord`, `diagnosis`, `pedestrian`, `eyebrow`, `defect` và nhiều mục khác trong gói mở rộng.
- Sửa trường từ loại placeholder `word` cho gói 500 từ mở rộng, dựa trên cách từ được dùng trong câu ví dụ và các ngoại lệ được rà soát riêng.

## Ví dụ trước/sau

- `She decided to break today.` → `Be careful not to break the glass on the kitchen floor.`
- `We can mean together this evening.` → `Could you explain what this word means during our English lesson today?`
- `I put the market in my wallet.` → `I bought fresh fruit at the market near my home this morning.`
- `We will meet next date.` → `We will choose a date for the meeting tomorrow.`
- `Dress này dễ mặc.` → `Chiếc váy này dễ mặc.`
- `I left my wallet at home this morning.` đi cùng nghĩa `trái` → nghĩa được chỉnh thành `để lại; rời đi (quá khứ của leave)`.

## Kiểm tra sau sửa

- Số lượng mục từ ban đầu/sau sửa: 3500/3500.
- Số lượng câu ban đầu/sau sửa: 3750/3750.
- Mục từ V2 còn placeholder từ loại `word`: 0.
- Câu luyện tập chính (nguồn `base` và `remote`) chưa đồng bộ ví dụ/nghĩa với từ vựng: 0.
- Mục từ không có ví dụ tiếng Anh hoặc tiếng Việt: 0.
- Ví dụ từ vựng mà bộ kiểm tra từ đích chưa nhận ra: 10; trường hợp phrasal verb như `view as` cần kiểm tra theo nhiều từ, không thể chỉ dùng tìm chuỗi liền nhau.
- Câu còn khớp với một số mẫu rủi ro đã biết: 8.

## Ghi chú chất lượng

Đây là đợt rà soát dữ liệu theo ngữ cảnh trên toàn bộ tệp, kết hợp sửa thủ công và quy tắc kiểm tra nhất quán. Một số câu nguồn có thể vẫn cần người học/biên tập viên rà soát theo chuyên ngành, sắc thái vùng miền, hoặc nhiều nghĩa của từ. Bản này không tự nhận rằng mọi câu đã được người bản ngữ xác nhận. Nhánh riêng được tạo để xem xét thay đổi trước khi nhập vào `main`.
