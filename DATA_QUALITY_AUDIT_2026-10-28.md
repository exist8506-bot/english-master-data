# Báo cáo rà soát dữ liệu English Master — 2026-10-28

## Phạm vi dữ liệu

Đã đọc dữ liệu từ nhánh gốc và rà soát toàn bộ các tệp dữ liệu hiện có trước khi sửa.

| Tệp | Số bản ghi trên nhánh gốc |
|---|---:|
| `data/vocabulary.json` | 3.500 |
| `data/sentences.json` | 3.750 |
| `data/questions.json` | 6.000 |
| `data/grammar.json` | 80 |
| `data/communication.json` | 328 bộ hội thoại |
| `data/trilingual.json` | 3.000 |

## Các thay đổi thực tế so với `main`

- **Từ vựng:** 1.552 bản ghi có ít nhất một trường thay đổi. Trong đó: 196 nghĩa được sửa; 183 ví dụ tiếng Anh và 183 bản dịch ví dụ được sửa; 1.000 mục IPA trong nguồn cũ được thống nhất định dạng dấu gạch chéo; 500 mục của gói `expansion500_v2` không còn loại từ chung chung `word`; 199 chủ đề được điều chỉnh.
- **Ngân hàng câu:** 178 bản ghi câu và bản dịch được cập nhật theo khóa nguồn ổn định. Chỉ đồng bộ khi xác định được bản ghi gốc tương ứng; không ghi đè hàng loạt khi không đủ căn cứ liên kết.
- **Câu hỏi:** 305 bản ghi có ít nhất một thay đổi, gồm 196 ô lựa chọn/giải thích nghĩa và 109 câu hỏi điền từ được đồng bộ với ví dụ đã chỉnh.
- **Kiểm tra cấu trúc:** cả 6.000 câu hỏi vẫn có cấu trúc lựa chọn và chỉ số đáp án hợp lệ sau khi sửa.

## Ví dụ lỗi đã sửa

| Trường hợp | Trước | Sau |
|---|---|---|
| `invite` | “Chuyển đến lời mời” | “mời; mời tham dự” |
| `cave` | “lỗ (trong fomat)” | “hang; hang động” |
| `tap` | “Nghe trộm” | “vòi nước; gõ hoặc chạm nhẹ” |
| `fascinating` | “phẩm chất” | “hấp dẫn; cuốn hút” |
| `defect` | “khuyết xạ” | “lỗi; khiếm khuyết; khuyết tật” |
| `waterfall` | “Hiệu ứng Quét Trang trình diễn” | “thác nước” |
| `elevator` | “cánh nâng” | “thang máy” |

Một số ví dụ được viết lại để đặt từ vào tình huống tự nhiên, có mốc thời gian/địa điểm khi phù hợp. Ví dụ:

- **The driver appeared intoxicated at the checkpoint outside town last night.** — Tối qua, người lái xe có vẻ say rượu tại chốt kiểm tra bên ngoài thị trấn.
- **We reached the waterfall in the national park shortly before sunset on Sunday.** — Chủ nhật, chúng tôi đến thác nước trong vườn quốc gia ngay trước lúc hoàng hôn.
- **I will invite my classmates to study with me at the library tomorrow afternoon.** — Chiều mai, tôi sẽ mời các bạn cùng lớp đến học với tôi tại thư viện.

## Những điểm còn cần xử lý

Đây là **đợt sửa lỗi có độ tin cậy cao và rà soát tự động ban đầu**, chưa phải xác nhận rằng từng mục đã được biên tập thủ công đầy đủ. Cần tiếp tục xử lý các điểm sau:

1. **500 mục chưa có IPA** trong nhóm `extra500_v8`. Chưa tự tạo phiên âm cho chúng vì cần đối chiếu từ điển phát âm có nguồn đáng tin cậy.
2. **321 loại từ được suy luận tự động** từ dạng từ/câu ví dụ và được gắn `posReviewStatus: inferred_from_example`. Cần người rà soát xác nhận từng mục trước khi coi là chuẩn cuối cùng; không nên xem chúng là đã được chuyên gia xác minh.
3. **249 câu chưa có nhãn ngữ pháp**. Cần phân loại câu theo cấu trúc thực tế thay vì tự gán nhãn chung.
4. Ngân hàng câu còn **237 nhóm câu trùng**, tương đương **276 bản ghi dư nếu chỉ xét văn bản câu giống nhau**. Chưa xóa các bản ghi này vì cần xác định và cập nhật mọi tham chiếu đến ID trong câu hỏi/tiến độ học trước.
5. Cần rà soát ngữ cảnh và sắc thái bản dịch còn lại, nhất là các câu ngắn hoặc trừu tượng. Không phải câu nào thiếu thời gian/địa điểm đều sai; chỉ nên thêm bối cảnh khi tự nhiên và có ích cho việc học.

## An toàn dữ liệu và cách đưa vào ứng dụng

Toàn bộ thay đổi đang ở nhánh `content/contextual-review-2026-10-28`; nhánh `main` chưa bị ghi đè. Nên xem diff và hoàn tất các mục còn lại trước khi hợp nhất. Báo cáo này ghi rõ phần đã thay đổi và phần chưa được xác minh, tránh hiểu nhầm là toàn bộ kho đã hoàn thiện.
