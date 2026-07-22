const g=["ticket80","ticket55"];function w(e){return g.includes(e)}function b(e){return e==="ticket55"?55:e==="ticket80"?80:null}function x(e){return e==="ticket55"?2:e==="ticket80"?3:0}function k(e){return e==="ticket55"?[55,200]:e==="ticket80"?[80,200]:null}function y(e){if(e==="a4")return{isTicket:!1,previewWidth:null,maxWidth:720,pad:3,baseFont:15,businessName:22,businessDesc:13,docTitle:17,meta:13,date:18,customer:16,total:17,footer:12,signature:14,tableProductWidth:"auto",productColPct:null,print:null};const t=e==="ticket55";return{isTicket:!0,narrow:t,previewWidth:t?200:280,maxWidth:t?200:280,pad:t?.75:1,baseFont:t?12:14,businessName:t?14:17,businessDesc:t?10:12,docTitle:t?13:15,meta:t?10:12,date:t?13:16,customer:t?12:14,total:t?13:15,footer:t?10:11,signature:t?11:13,tableProductWidth:t?"38%":"42%",productColPct:t?{product:"38%",cant:"14%",pu:"24%",total:"24%"}:{product:"40%",cant:"12%",pu:"24%",total:"24%"},print:t?{fs:"11px",title:14,desc:10,docTitle:13,meta:10,date:13,customer:12,num:10,totalBold:13,notes:10,footer:10,signature:11,padH:"1mm"}:{fs:"13px",title:17,desc:12,docTitle:15,meta:12,date:16,customer:14,num:12,totalBold:15,notes:11,footer:11,signature:13,padH:"2mm"}}}function $(e,{format:t="a4"}={}){if(!e)return;const m=w(t),i=b(t)??80,a=x(t),s=m?`
    @page { size: ${i}mm 200mm portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0 auto;
      padding: 0;
      width: ${i}mm;
      max-width: ${i}mm;
      min-width: ${i}mm;
      height: auto;
      background: #fff;
      color: #000;
      writing-mode: horizontal-tb;
      overflow-x: hidden;
    }
    body { font-family: Arial, sans-serif; }
    .receipt-print-root {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 2mm ${a}mm 1.5mm ${a}mm;
      box-sizing: border-box;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .receipt-print-root table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
    }
    .receipt-print-root th,
    .receipt-print-root td {
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    @media print {
      html, body {
        width: ${i}mm !important;
        max-width: ${i}mm !important;
        min-width: ${i}mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .receipt-print-root {
        width: 100% !important;
        max-width: 100% !important;
        padding: 2mm ${a}mm 1.5mm ${a}mm !important;
      }
    }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `:`
    @page { size: A4; margin: 8mm; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }
    body { font-family: Arial, sans-serif; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `,l=m?`<div class="receipt-print-root">${e}</div>`:e,p=`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Imprimir</title>
  <style>${s}</style>
</head>
<body>${l}</body>
</html>`,r=document.createElement("iframe");r.setAttribute("aria-hidden","true"),r.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;",document.body.appendChild(r);const n=r.contentWindow,o=n==null?void 0:n.document;if(!n||!o){r.remove();return}o.open(),o.write(p),o.close();const u=()=>{try{if(m){const d=o.querySelector(".receipt-print-root")||o.body,h=Math.max(d.scrollHeight,d.offsetHeight,d.clientHeight),f=Math.max(i+20,Math.ceil(h*.264583)+4),c=o.createElement("style");c.textContent=`
          @page { size: ${i}mm ${f}mm portrait !important; margin: 0 !important; }
          html, body {
            width: ${i}mm !important;
            max-width: ${i}mm !important;
            min-width: ${i}mm !important;
          }
        `,o.head.appendChild(c)}n.focus(),n.print()}finally{window.setTimeout(()=>r.remove(),1500)}};window.setTimeout(u,350)}export{k as a,y as g,w as i,$ as p};
