#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file=path.join(process.cwd(),"data","sentences.json");
const rows=JSON.parse(fs.readFileSync(file,"utf8"));

const replacements={
  "exp500_sent_180_2f017e61":{
    en:"I set a reminder so I would not miss the appointment.",
    vi:"Tôi đặt lời nhắc để không bỏ lỡ cuộc hẹn."
  },
  "exp500_sent_185_8edd7090":{
    en:"She packed a light lunch before leaving for work.",
    vi:"Cô ấy chuẩn bị một bữa trưa nhẹ trước khi đi làm."
  },
  "exp500_sent_190_f0f686cb":{
    en:"He adjusted his chair before starting his computer work.",
    vi:"Anh ấy chỉnh lại ghế trước khi bắt đầu làm việc trên máy tính."
  },
  "exp500_sent_195_afdffa57":{
    en:"The two shelves look balanced on the wall.",
    vi:"Hai chiếc kệ trông cân đối trên tường."
  },
  "exp500_sent_200_90731809":{
    en:"The bus arrived a few minutes after I called.",
    vi:"Xe buýt đến vài phút sau khi tôi gọi."
  },
  "exp500_sent_285_2c8f06cc":{
    en:"We opened the windows because the room felt warm.",
    vi:"Chúng tôi mở cửa sổ vì căn phòng cảm thấy ấm."
  },
  "exp500_sent_290_115d6a":{
    en:"She looked out the window while waiting for the rain to stop.",
    vi:"Cô ấy nhìn ra cửa sổ trong khi chờ mưa tạnh."
  },
  "exp500_sent_300_e2d6c725":{
    en:"They reported the lost wallet to the front desk.",
    vi:"Họ báo chiếc ví bị mất với quầy lễ tân."
  },
  "exp500_sent_310_b3759975":{
    en:"He smiled when his friend walked into the room.",
    vi:"Anh ấy mỉm cười khi bạn mình bước vào phòng."
  },
  "exp500_sent_444_c84f6ccc":{
    en:"Please leave the books on the table when you are finished.",
    vi:"Vui lòng để sách trên bàn khi bạn đọc xong."
  },
  "exp500_sent_449_3ba611a":{
    en:"The company sent a written reply to the customer.",
    vi:"Công ty gửi phản hồi bằng văn bản cho khách hàng."
  },
  "exp500_sent_469_3bedcd10":{
    en:"I changed my plans because the weather turned bad.",
    vi:"Tôi thay đổi kế hoạch vì thời tiết trở nên xấu."
  },
  "exp500_sent_474_bc98fcdf":{
    en:"We reached an agreement after a short discussion.",
    vi:"Chúng tôi đạt được thỏa thuận sau một cuộc thảo luận ngắn."
  }
};

const byId=new Map(rows.map(r=>[String(r?.id??""),r]));
const missing=[];
const changed=[];
for(const [id,next] of Object.entries(replacements)){
  const row=byId.get(id);
  if(!row){missing.push(id);continue;}
  if(String(row.source??"")!=="expansion500") throw new Error("Unexpected source for "+id);
  const old={en:row.en,vi:row.vi};
  row.en=next.en;
  row.vi=next.vi;
  row.audioEn="https://dict.minhqnd.com/api/v1/tts?word="+encodeURIComponent(next.en)+"&lang=en";
  changed.push({id,old,...next});
}
if(missing.length)throw new Error("Missing sentence IDs: "+missing.join(", "));
if(changed.length!==Object.keys(replacements).length)throw new Error("Unexpected replacement count");

fs.writeFileSync(file,JSON.stringify(rows,null,2)+"\n","utf8");

console.log(JSON.stringify({
  status:"PASS",
  changed:changed.length,
  replacements:changed
},null,2));
