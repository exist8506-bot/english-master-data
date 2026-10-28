# English Master — bản rà soát ngữ cảnh

- Kho nguồn: [english-master-data](https://github.com/exist8506-bot/english-master-data)
- Nhánh rà soát: `review/english-context-20261028`
- Nhánh `main` không bị ghi đè.
- Phiên bản dữ liệu ghi trong metadata: **8.1.1** (ngày: 2026-09-28).
- Từ vựng đã xuất: **3500 mục**.
- Câu mẫu đã xuất: **3750 câu**.
- Các mục từ/câu được sửa lỗi ngữ cảnh rõ ràng: **14 mục từ** và **29 bản ghi câu**.
- Thiếu IPA: **500 mục**.
- Dùng loại từ chung `word`: **500 mục**.
- Thiếu nhãn ngữ pháp: **249 câu**.
- Nhóm câu lặp nguyên văn: **241 nhóm**; không tự xóa để tránh mất ID/liên kết ứng dụng.

## Tệp

- `vocabulary-context-reviewed.csv`: toàn bộ mục từ, nghĩa, từ loại, ví dụ gốc, ví dụ đề xuất, dịch gốc/đề xuất, thời gian, địa điểm, quan hệ không gian và trạng thái rà soát.
- `sentences-context-reviewed.csv`: toàn bộ câu, dịch gốc/đề xuất, chủ đề, ngữ pháp, từ mục tiêu, thời gian, địa điểm, quan hệ không gian, số lần lặp và trạng thái rà soát.

## Nguyên tắc xử lý

1. Giữ lại văn bản và ID nguồn để đối chiếu; khi có sửa, đặt bản gốc và bản rà soát ở các cột riêng.
2. Chỉ đánh dấu thời gian, địa điểm hoặc quan hệ không gian khi có từ/cụm từ thể hiện rõ trong câu. Không tự bịa một ngày, giờ hoặc nơi chốn cho mọi câu.
3. Ngữ cảnh tình huống là nhãn gợi ý dựa trên chủ đề nguồn; hãy đọc cả câu trước khi dùng.
4. Không tự đoán IPA đang thiếu. Các mục loại từ chỉ ghi `word` được đánh dấu để xác định lại từ loại dựa trên nghĩa và cách dùng.
5. Đây là bản xuất đầy đủ có gắn nhãn và sửa các lỗi rõ ràng, **không phải tuyên bố rằng toàn bộ 7.250 dòng đã được người biên tập kiểm chứng thủ công từng chữ**. Các dòng có trạng thái cần rà soát phải tiếp tục được kiểm tra.

## Các sửa đổi ngữ cảnh có độ chắc chắn cao

| Câu gốc | Câu đã rà soát | Bản dịch tiếng Việt |
|---|---|---|
| i usually study in the week. | I usually study during the week after my morning classes. | Tôi thường học trong tuần sau các buổi học buổi sáng. |
| we talked about the street after dinner. | We walked along the main street after dinner. | Chúng tôi đi dọc con phố chính sau bữa tối. |
| we talked about the stage after dinner. | The singer stepped onto the stage at 7 p.m. before the concert. | Ca sĩ bước lên sân khấu lúc 7 giờ tối trước buổi hòa nhạc. |
| we saw the air during our walk. | We enjoyed the fresh air during our walk in the park. | Chúng tôi tận hưởng không khí trong lành khi đi dạo trong công viên. |
| it is active to practice every day. | She stays active by walking to campus every morning. | Cô ấy duy trì sự năng động bằng cách đi bộ đến trường mỗi sáng. |
| she decided to break today. | She accidentally broke a glass while washing the dishes this morning. | Sáng nay, cô ấy vô tình làm vỡ một chiếc cốc khi rửa bát. |
| it is bright to practice every day. | The classroom is bright in the morning because it has large windows. | Phòng học sáng sủa vào buổi sáng vì có những cửa sổ lớn. |
| i checked the sale before paying. | I checked the sale price at the shop before paying. | Tôi kiểm tra giá khuyến mãi tại cửa hàng trước khi thanh toán. |
| the teacher explained the grade clearly. | The teacher explained how our final grades were calculated after class. | Sau giờ học, giáo viên giải thích cách tính điểm tổng kết của chúng tôi. |
| i checked the banknote before paying. | The shop assistant checked whether the banknote was genuine before accepting it. | Nhân viên cửa hàng kiểm tra xem tờ tiền giấy có thật hay không trước khi nhận. |
| i checked the rent before paying. | I confirmed the rent amount with my landlord before paying it on the first of the month. | Tôi xác nhận số tiền thuê nhà với chủ nhà trước khi trả vào ngày đầu tháng. |
| i checked the amount before paying. | I checked the total amount on the bill at the counter before paying. | Tôi kiểm tra tổng số tiền trên hóa đơn tại quầy trước khi thanh toán. |
| i checked the expense before paying. | I recorded the travel expense before submitting my monthly report at work. | Tôi ghi lại khoản chi phí đi lại trước khi nộp báo cáo tháng tại nơi làm việc. |
| i checked the brand before paying. | I compared the brand and price of the shoes at the sports store before buying them. | Tôi so sánh thương hiệu và giá đôi giày tại cửa hàng thể thao trước khi mua. |
| i checked the industry before paying. | She researched the industry before investing in the company last month. | Tháng trước, cô ấy nghiên cứu ngành đó trước khi đầu tư vào công ty. |
| the similar words sometimes confuse me. | Similar words sometimes confuse me when I write essays for class. | Những từ có nghĩa gần giống nhau đôi khi khiến tôi nhầm lẫn khi viết bài luận trên lớp. |
