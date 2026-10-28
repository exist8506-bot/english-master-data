# English Master — bản rà soát ngữ cảnh (cập nhật lần 2)

- Kho nguồn: [english-master-data](https://github.com/exist8506-bot/english-master-data)
- Nhánh rà soát: `review/english-context-20261028`; nhánh `main` không bị ghi đè.
- Phiên bản metadata nguồn: **8.1.1** (cập nhật ghi trong metadata: 2026-09-28).
- Từ vựng đã xuất: **3500 mục**.
- Câu mẫu đã xuất: **3750 câu**.
- Ví dụ/câu được sửa: **48 mục từ** và **68 bản ghi câu**.
- Thiếu IPA: **500 mục**.
- Dùng nhãn loại từ chung `word`: **500 mục**.
- Thiếu nhãn ngữ pháp: **249 câu**.
- Nhóm câu trùng nguyên văn: **241 nhóm**; giữ nguyên để không mất ID/liên kết.
- Còn gắn cờ cần rà soát ngữ nghĩa: **49 mục từ** và **62 câu**.

## Tệp dữ liệu

- `vocabulary-context-reviewed.csv`: toàn bộ 3.500 mục từ; nghĩa/từ loại/IPA gốc; ví dụ và bản dịch gốc + đề xuất; ngữ cảnh, thời gian, địa điểm, quan hệ không gian, trạng thái.
- `sentences-context-reviewed.csv`: toàn bộ 3.750 câu; câu và bản dịch gốc + đề xuất; chủ đề, ngữ pháp, từ mục tiêu, thời gian, địa điểm, quan hệ không gian, số lần lặp và trạng thái.

## Cách đọc trường ngữ cảnh

- `context_situation`: nhãn gợi ý dựa trên chủ đề nguồn; không thay thế việc đọc cả câu.
- `time_context`/`time_type`: chỉ ghi dấu hiệu thời gian thể hiện trong câu; không có thì ghi rõ “Không nêu cụ thể trong câu gốc”.
- `place_context`: chỉ ghi địa điểm nhận diện được; không tự đặt địa chỉ hoặc thành phố.
- `spatial_relation`: dấu hiệu không gian như beside, behind, between, along.
- `status`/`review_note`: chỉ ra thay đổi, thiếu dữ liệu, câu lặp và mẫu cần rà soát.

## Các sửa đổi ngữ cảnh có độ chắc chắn cao

| Câu gốc | Câu đã rà soát | Bản dịch tiếng Việt |
|---|---|---|
| i usually study in the week. | I usually study during the week after my morning classes. | Tôi thường học trong tuần sau các buổi học buổi sáng. |
| we talked about the street after dinner. | We walked along the main street after dinner. | Chúng tôi đi dọc con phố chính sau bữa tối. |
| we talked about the stage after dinner. | The singer stepped onto the stage at 7 p.m. before the concert. | Ca sĩ bước lên sân khấu lúc 7 giờ tối trước buổi hòa nhạc. |
| we saw the air during our walk. | We enjoyed the fresh air during our walk in the park. | Chúng tôi tận hưởng không khí trong lành khi đi dạo trong công viên. |
| it is active to practice every day. | She stays active by walking to campus every morning. | Cô ấy duy trì sự năng động bằng cách đi bộ đến trường mỗi sáng. |
| it is patient to practice every day. | A patient tutor explains difficult grammar slowly to beginners. | Một gia sư kiên nhẫn giải thích ngữ pháp khó cho người mới học một cách từ tốn. |
| it is important to practice every day. | It is important to practice every day. | Việc luyện tập mỗi ngày rất quan trọng. |
| it is bright to practice every day. | The classroom is bright in the morning because it has large windows. | Phòng học sáng sủa vào buổi sáng vì có những cửa sổ lớn. |
| it is relaxed to practice every day. | I feel relaxed after practicing yoga at home in the evening. | Tôi cảm thấy thư giãn sau khi tập yoga ở nhà vào buổi tối. |
| it is confident to practice every day. | She feels confident when she answers questions in English class. | Cô ấy cảm thấy tự tin khi trả lời câu hỏi trong giờ tiếng Anh. |
| it is available to practice every day. | The study room is available to students until 9 p.m. | Phòng tự học mở cho sinh viên sử dụng đến 9 giờ tối. |
| she decided to break today. | She accidentally broke a glass while washing the dishes this morning. | Sáng nay, cô ấy vô tình làm vỡ một chiếc cốc khi rửa bát. |
| she decided to boil today. | She decided to boil the eggs for breakfast this morning. | Sáng nay, cô ấy quyết định luộc trứng cho bữa sáng. |
| she decided to meet today. | She decided to meet her project partner at the library after class. | Cô ấy quyết định gặp bạn cùng nhóm dự án tại thư viện sau giờ học. |
| she decided to hope today. | She hopes to pass her English exam this Friday. | Cô ấy hy vọng sẽ vượt qua kỳ thi tiếng Anh vào thứ Sáu này. |
| she decided to fail today. | She was afraid she might fail the exam after missing two classes. | Cô ấy sợ mình có thể trượt kỳ thi sau khi nghỉ hai buổi học. |
| she decided to share today. | She decided to share her notes with a classmate after the lesson. | Cô ấy quyết định chia sẻ ghi chú với một bạn cùng lớp sau buổi học. |
| she decided to kick today. | He decided to kick the ball across the field during practice. | Cậu ấy quyết định đá bóng qua sân trong buổi tập. |
| she decided to wake today. | She decided to wake up early to catch the 7 a.m. bus. | Cô ấy quyết định thức dậy sớm để kịp chuyến xe buýt lúc 7 giờ sáng. |
| she decided to shout today. | She shouted for help when she saw smoke in the kitchen this morning. | Sáng nay, cô ấy hét gọi trợ giúp khi nhìn thấy khói trong bếp. |
| she decided to pack today. | She decided to pack her suitcase the night before her trip. | Cô ấy quyết định xếp hành lý vào tối trước chuyến đi. |
| she decided to own today. | She hopes to own a small café near the university someday. | Cô ấy hy vọng một ngày nào đó sẽ sở hữu một quán cà phê nhỏ gần trường đại học. |
| she decided to allow today. | The teacher decided to allow students to use dictionaries during the test. | Giáo viên quyết định cho phép sinh viên dùng từ điển trong bài kiểm tra. |
| she decided to trust today. | She decided to trust her instincts when choosing a safe route home. | Cô ấy quyết định tin vào trực giác khi chọn đường về nhà an toàn. |
| she decided to rise today. | Prices rose this week after heavy rain damaged local crops. | Giá cả tăng trong tuần này sau khi mưa lớn làm hư hại mùa màng địa phương. |
| i checked the sale before paying. | I checked the sale price at the shop before paying. | Tôi kiểm tra giá khuyến mãi tại cửa hàng trước khi thanh toán. |
| the teacher explained the grade clearly. | The teacher explained how our final grades were calculated after class. | Sau giờ học, giáo viên giải thích cách tính điểm tổng kết của chúng tôi. |
| i checked the banknote before paying. | The shop assistant checked whether the banknote was genuine before accepting it. | Nhân viên cửa hàng kiểm tra xem tờ tiền giấy có thật hay không trước khi nhận. |
| i checked the rent before paying. | I confirmed the rent amount with my landlord before paying it on the first of the month. | Tôi xác nhận số tiền thuê nhà với chủ nhà trước khi trả vào ngày đầu tháng. |
| i checked the amount before paying. | I checked the total amount on the bill at the counter before paying. | Tôi kiểm tra tổng số tiền trên hóa đơn tại quầy trước khi thanh toán. |
| i checked the expense before paying. | I recorded the travel expense before submitting my monthly report at work. | Tôi ghi lại khoản chi phí đi lại trước khi nộp báo cáo tháng tại nơi làm việc. |
| i checked the brand before paying. | I compared the brand and price of the shoes at the sports store before buying them. | Tôi so sánh thương hiệu và giá đôi giày tại cửa hàng thể thao trước khi mua. |
| i checked the industry before paying. | She researched the industry before investing in the company last month. | Tháng trước, cô ấy nghiên cứu ngành đó trước khi đầu tư vào công ty. |
| the similar words sometimes confuse me. | Similar words sometimes confuse me when I write essays for class. | Những từ có nghĩa gần giống nhau đôi khi khiến tôi nhầm lẫn khi viết bài luận trên lớp. |
| i put the beach in my travel bag. | We spent the afternoon at the beach during our trip. | Trong chuyến đi, chúng tôi dành buổi chiều ở bãi biển. |
| i put the market in my wallet. | I bought fresh vegetables at the market before heading home. | Tôi mua rau tươi ở chợ trước khi về nhà. |
| we can buy together this evening. | We can buy groceries together at the supermarket this evening. | Chúng ta có thể cùng nhau mua thực phẩm ở siêu thị vào tối nay. |
| we can sometimes together this evening. | We sometimes study together at the library in the evening. | Chúng tôi thỉnh thoảng học cùng nhau ở thư viện vào buổi tối. |
| we can agree together this evening. | We can agree on a plan together at the campus café this evening. | Chúng ta có thể cùng thống nhất kế hoạch tại quán cà phê trong khuôn viên trường tối nay. |
| we can tell together this evening. | We can tell our classmates the news together after class this evening. | Chúng ta có thể cùng kể tin đó cho các bạn cùng lớp sau giờ học tối nay. |
| we can hear together this evening. | We can hear the live band together at the café this evening. | Chúng ta có thể cùng nghe ban nhạc biểu diễn trực tiếp ở quán cà phê tối nay. |
| we can mean together this evening. | We can discuss what these words mean together during English class this evening. | Chúng ta có thể cùng thảo luận ý nghĩa những từ này trong giờ tiếng Anh tối nay. |
| we can open together this evening. | We can open the shop together at 6 p.m. this evening. | Chúng ta có thể cùng mở cửa hàng lúc 6 giờ tối nay. |
| we can do together this evening. | We can do the group assignment together at the library this evening. | Chúng ta có thể cùng làm bài tập nhóm ở thư viện tối nay. |
| we can keep together this evening. | We can keep our group together during the campus event this evening. | Chúng ta có thể giữ cả nhóm ở cùng nhau trong sự kiện tại trường tối nay. |
| we can hate together this evening. | We can admit together that we hate the noise from the construction site this evening. | Chúng ta có thể cùng thừa nhận rằng mình ghét tiếng ồn từ công trường tối nay. |
| we can quickly together this evening. | We can finish the assignment quickly together at the library this evening. | Chúng ta có thể cùng hoàn thành bài tập nhanh chóng ở thư viện tối nay. |
| we can almost together this evening. | We are almost ready to leave together for the concert this evening. | Chúng tôi gần như đã sẵn sàng cùng đi xem hòa nhạc tối nay. |
| we can also together this evening. | We can also study together at the campus café this evening. | Chúng ta cũng có thể học cùng nhau tại quán cà phê trong khuôn viên trường tối nay. |
| we can apart together this evening. | We should stay apart in the crowded hall this evening. | Chúng ta nên giữ khoảng cách trong hội trường đông người tối nay. |
| we can near together this evening. | We can sit near each other at the café this evening. | Chúng ta có thể ngồi gần nhau ở quán cà phê tối nay. |
| i use my password to study at night. | I enter my password to access the English-learning app before bed. | Tôi nhập mật khẩu để truy cập ứng dụng học tiếng Anh trước khi đi ngủ. |
| they tried to notice carefully. | They tried to notice the warning sign before entering the building. | Họ cố gắng chú ý đến biển cảnh báo trước khi vào tòa nhà. |
| they tried to prevent carefully. | They tried to prevent accidents by wearing helmets while cycling. | Họ cố gắng ngăn ngừa tai nạn bằng cách đội mũ bảo hiểm khi đi xe đạp. |
| they tried to create carefully. | They created a detailed poster for the school event. | Họ tạo ra một tấm áp phích chi tiết cho sự kiện ở trường. |
| they tried to complain carefully. | They complained politely to the hotel manager about the noisy room. | Họ lịch sự phàn nàn với quản lý khách sạn về căn phòng ồn ào. |
| they tried to contribute carefully. | They contributed useful ideas during the group discussion. | Họ đóng góp những ý tưởng hữu ích trong buổi thảo luận nhóm. |
| they tried to decrease carefully. | They tried to decrease their monthly expenses by cooking at home. | Họ cố giảm chi phí hằng tháng bằng cách nấu ăn ở nhà. |
| they tried to recommend carefully. | The staff recommended a nearby restaurant to the visitors. | Nhân viên giới thiệu một nhà hàng gần đó cho khách tham quan. |
| they tried to support carefully. | They supported their classmate while she prepared for the exam. | Họ hỗ trợ bạn cùng lớp khi cô ấy chuẩn bị cho kỳ thi. |
| they tried to continue carefully. | They continued the experiment carefully in the school laboratory. | Họ tiếp tục thí nghiệm một cách cẩn thận trong phòng thí nghiệm của trường. |
| they tried to establish carefully. | They established a clear schedule for the group project. | Họ lập một lịch trình rõ ràng cho dự án nhóm. |
| they tried to wonder carefully. | They wondered whether the answer was correct during the discussion. | Họ tự hỏi liệu đáp án có đúng trong lúc thảo luận hay không. |
| they tried to disturb carefully. | They tried not to disturb the patients in the hospital. | Họ cố gắng không làm phiền các bệnh nhân trong bệnh viện. |
| they tried to entertain carefully. | The host entertained the guests with music at the hotel last night. | Tối qua, người dẫn chương trình giải trí cho khách bằng âm nhạc tại khách sạn. |
| they tried to express carefully. | They expressed their concerns clearly during the meeting. | Họ trình bày những lo ngại của mình rõ ràng trong cuộc họp. |
| they tried to propose carefully. | They proposed a new plan during the meeting. | Họ đề xuất một kế hoạch mới trong cuộc họp. |
| they tried to resolve carefully. | They resolved the conflict calmly before the project deadline. | Họ giải quyết mâu thuẫn bình tĩnh trước hạn chót của dự án. |
| they tried to serve carefully. | They served the customers carefully at the café. | Họ phục vụ khách hàng cẩn thận tại quán cà phê. |
| they tried to submit carefully. | They submitted the assignment before class ended. | Họ nộp bài tập trước khi buổi học kết thúc. |
| they tried to thank carefully. | They thanked their teacher after the lesson. | Họ cảm ơn giáo viên sau buổi học. |
| they tried to appear carefully. | The actor appeared on stage at 7 p.m. before the show. | Diễn viên xuất hiện trên sân khấu lúc 7 giờ tối trước buổi diễn. |
| they tried to gain carefully. | They gained valuable experience while working at the hotel. | Họ tích lũy kinh nghiệm quý báu khi làm việc tại khách sạn. |

## Việc còn cần làm

1. Bổ sung IPA cho **500 mục** từ nguồn phát âm đáng tin cậy; không đoán IPA.
2. Xác định lại từ loại cho **500 mục** chỉ ghi `word`.
3. Bổ sung/kiểm tra nhãn ngữ pháp của **249 câu**.
4. Các dòng có trạng thái `needs-semantic-review` cần người biên tập xem từng nghĩa; không dùng một khuôn để áp vào mọi từ.
5. Không xóa các câu trùng tự động vì có thể làm hỏng ID và liên kết.

**Giới hạn chính xác:** đây là bản xuất đầy đủ, được gắn nhãn và có sửa một tập hợp lỗi ngữ cảnh rõ ràng. Không khẳng định toàn bộ 7.250 dòng đã được người biên tập kiểm chứng thủ công từng chữ. Nếu câu gốc không nêu thời gian/địa điểm thì không tự thêm dữ kiện.
