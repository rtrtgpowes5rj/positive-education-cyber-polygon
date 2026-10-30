// Настоящий .xlsx без библиотек: таблица из строк и ZIP без сжатия.
// Очки — числа, время и дата — значения Excel, поэтому столбцы сортируются и считаются.
const esc=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships',PKG='http://schemas.openxmlformats.org/package/2006';

const str=(ref,v,style=0)=>`<c r="${ref}" t="inlineStr"${style?` s="${style}"`:''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
const num=(ref,v,style=0)=>`<c r="${ref}"${style?` s="${style}"`:''}><v>${v}</v></c>`;
// дата Excel в местном времени: число дней от 30.12.1899
const excelDate=ms=>(ms-new Date(ms).getTimezoneOffset()*60000)/86400000+25569;

const HEAD=['Место','Ник','Очки','Время','Дата'];
function sheet(rows){
 const last=rows.length+1;
 const body=rows.map((r,i)=>{const n=i+2;return `<row r="${n}">${num('A'+n,i+1)}${str('B'+n,r.name)}${num('C'+n,r.score)}${num('D'+n,r.secs/86400,2)}${num('E'+n,excelDate(r.at),3)}</row>`}).join('');
 return XML+`<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
  +'<cols><col min="1" max="1" width="9" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/><col min="3" max="3" width="10" customWidth="1"/><col min="4" max="4" width="10" customWidth="1"/><col min="5" max="5" width="18" customWidth="1"/></cols>'
  +`<sheetData><row r="1">${HEAD.map((h,i)=>str('ABCDE'[i]+'1',h,1)).join('')}</row>${body}</sheetData><autoFilter ref="A1:E${last}"/></worksheet>`;
}
const STYLES=XML+`<styleSheet xmlns="${NS}"><numFmts count="2"><numFmt numFmtId="164" formatCode="[m]:ss"/><numFmt numFmtId="165" formatCode="dd.mm.yyyy\\ hh:mm"/></numFmts>`
 +'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
 +'<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
 +'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
 +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
 +'<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=~0;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return ~c>>>0};

function zip(files){
 const enc=new TextEncoder(),parts=[],central=[];let off=0;
 for(const [name,text] of files){
  const n=enc.encode(name),d=enc.encode(text),crc=crc32(d);
  const head=(sig,extra)=>{const h=new DataView(new ArrayBuffer(extra?46:30));let p=0;
   const u32=v=>{h.setUint32(p,v,true);p+=4},u16=v=>{h.setUint16(p,v,true);p+=2};
   u32(sig);if(extra)u16(20);u16(20);u16(0x0800);u16(0);u16(0);u16(0x21);u32(crc);u32(d.length);u32(d.length);u16(n.length);u16(0);
   if(extra){u16(0);u16(0);u16(0);u32(0);u32(off)}
   return new Uint8Array(h.buffer)};
  const l=head(0x04034b50,false);central.push(head(0x02014b50,true),n);parts.push(l,n,d);off+=l.length+n.length+d.length;
 }
 const size=central.reduce((s,c)=>s+c.length,0),e=new DataView(new ArrayBuffer(22));
 e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,off,true);
 return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

export const makeXlsx=rows=>zip([
 ['[Content_Types].xml',XML+`<Types xmlns="${PKG}/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
 ['_rels/.rels',XML+`<Relationships xmlns="${PKG}/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
 ['xl/workbook.xml',XML+`<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="Топ игроков" sheetId="1" r:id="rId1"/></sheets></workbook>`],
 ['xl/_rels/workbook.xml.rels',XML+`<Relationships xmlns="${PKG}/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`],
 ['xl/worksheets/sheet1.xml',sheet(rows)],
 ['xl/styles.xml',STYLES]
]);
