import{w as S}from"./index-CgkHZqeL.js";import{f as D}from"./functions-D8_GGxhr.js";const z=["ticket80","ticket55"];function M(t){return z.includes(t)}function F(t){return t==="ticket55"?55:t==="ticket80"?80:null}function L(t){return t==="ticket55"?2:t==="ticket80"?3:0}function Q(t){return t==="ticket55"?[55,200]:t==="ticket80"?[80,200]:null}function I(t){if(t==="a4")return{isTicket:!1,previewWidth:null,maxWidth:720,pad:3,baseFont:15,businessName:22,businessDesc:13,docTitle:17,meta:13,date:18,customer:16,total:17,footer:12,signature:14,tableProductWidth:"auto",productColPct:null,print:null};const e=t==="ticket55";return{isTicket:!0,narrow:e,previewWidth:e?200:280,maxWidth:e?200:280,pad:e?.75:1,baseFont:e?12:14,businessName:e?14:17,businessDesc:e?10:12,docTitle:e?13:15,meta:e?10:12,date:e?13:16,customer:e?12:14,total:e?13:15,footer:e?10:11,signature:e?11:13,tableProductWidth:e?"38%":"42%",productColPct:e?{product:"38%",cant:"14%",pu:"24%",total:"24%"}:{product:"40%",cant:"12%",pu:"24%",total:"24%"},print:e?{fs:"11px",title:14,desc:10,docTitle:13,meta:10,date:13,customer:12,num:10,totalBold:13,notes:10,footer:10,signature:11,padH:"1mm"}:{fs:"13px",title:17,desc:12,docTitle:15,meta:12,date:16,customer:14,num:12,totalBold:15,notes:11,footer:11,signature:13,padH:"2mm"}}}const P="[CAJA_POS]",q="[CONTADO]",_="[CREDITO]";function X({baseNote:t,saleType:e}){const n=e==="credito"?_:q,i=String(t).replace(/\[CAJA_POS\]/g,"").replace(/\[CONTADO\]/g,"").replace(/\[CREDITO\]/g,"").replace(/\s+/g," ").trim();return`${P} ${n} ${i}`.trim()}function j(t){if(!t)return"—";const e=String(t.notes||""),n=t.customer,i=String((n==null?void 0:n.name)||"").trim();if(!e.includes(P))return i||"—";const l=e.toLowerCase();return l.includes("mostrador")||l.includes("consumidor final")||l.includes("sin datos de cliente")?"Consumidor Final":i||"—"}function W(t){const e=String((t==null?void 0:t.notes)||"");return!(!e.includes(P)||e.includes(_)||String((t==null?void 0:t.paymentMethod)||"").toLowerCase()==="credito")}function Z(t){return!W(t)}function tt(t){return t.find(e=>{const n=String(e.name||"").toLowerCase();return n.includes("consumidor")||n.includes("final")})??null}function B(t,{format:e="a4"}={}){if(!t)return;const n=M(e),i=F(e)??80,l=L(e),o=n?`
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
      padding: 2mm ${l}mm 1.5mm ${l}mm;
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
        padding: 2mm ${l}mm 1.5mm ${l}mm !important;
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
  `,d=n?`<div class="receipt-print-root">${t}</div>`:t,a=`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Imprimir</title>
  <style>${o}</style>
</head>
<body>${d}</body>
</html>`,c=document.createElement("iframe");c.setAttribute("aria-hidden","true"),c.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;",document.body.appendChild(c);const p=c.contentWindow,m=p==null?void 0:p.document;if(!p||!m){c.remove();return}m.open(),m.write(a),m.close();const r=()=>{try{if(n){const s=m.querySelector(".receipt-print-root")||m.body,u=Math.max(s.scrollHeight,s.offsetHeight,s.clientHeight),h=Math.max(i+20,Math.ceil(u*.264583)+4),f=m.createElement("style");f.textContent=`
          @page { size: ${i}mm ${h}mm portrait !important; margin: 0 !important; }
          html, body {
            width: ${i}mm !important;
            max-width: ${i}mm !important;
            min-width: ${i}mm !important;
          }
        `,m.head.appendChild(f)}p.focus(),p.print()}finally{window.setTimeout(()=>c.remove(),1500)}};window.setTimeout(r,350)}const g=t=>Number(Number(t||0).toFixed(2)),T=t=>Number(Number(t||0).toFixed(3)),H={factura:"Factura",nota_venta:"Nota de venta",documento:"Comprobante",consumidor_final:"Consumidor final"},et=[{value:"factura",label:"Factura"},{value:"nota_venta",label:"Nota de venta"},{value:"documento",label:"Comprobante"},{value:"consumidor_final",label:"Consumidor final"}];function A(t){return H[t]||t||"—"}function N(t){switch(t){case"factura":return"FACTURA";case"nota_venta":return"NOTA DE VENTA";case"consumidor_final":return"CONSUMIDOR FINAL";default:return"COMPROBANTE DE VENTA"}}function ot(t,e){if(!t)return null;const n=e||t.documentType||"documento",i=t._customerRaw||{};if(n==="consumidor_final")return{...t,documentType:n,documentTypeLabel:A(n),documentTitle:N(n),customerName:"Consumidor Final",customerPhone:"",customerAddress:"",customerEmail:"",customerCedula:""};const l=String(i.name||"").trim()||(t.customerName&&t.customerName!=="Consumidor Final"?t.customerName:"")||"—";return{...t,documentType:n,documentTypeLabel:A(n),documentTitle:N(n),customerName:l,customerPhone:i.phone||t.customerPhone||"",customerAddress:i.address||t.customerAddress||"",customerEmail:i.email||t.customerEmail||"",customerCedula:i.cedula||t.customerCedula||""}}function nt(t,e){return t==="factura"?"factura":t==="nota_venta"?"nota_venta":e?"documento":"consumidor_final"}function $(t){return`$${g(t).toFixed(2)}`}function U(t){const e=T(t),n=Math.round(e*100)===e*100?2:3;return`$${e.toFixed(n)}`}function G(t){return D(t)}const v={name:"Nom:",cedula:"CI:",phone:"Tel:",address:"Dir:",payment:"Pag:"};function J(t){const e=String(t||"").toLowerCase();return e==="efectivo"?"Efectivo":e==="transferencia"?"Transferencia":e==="tarjeta"?"Tarjeta":e==="credito"?"Crédito":t||"—"}function O(t){if(!t)return null;const e=(t.items||[]).map(r=>({name:r.name||r.productName||"Producto",quantity:Number(r.quantity||0),price:T(r.price),lineTotal:g(r.lineTotal??Number(r.quantity)*Number(r.price)),taxRate:Number(r.taxRate||0),subtotal:g(r.subtotal??r.lineTotal),iva:g(r.iva||0)})),n=g(t.subtotal??e.reduce((r,s)=>r+s.subtotal,0)),i=g(t.iva??e.reduce((r,s)=>r+s.iva,0)),l=g(t.total??e.reduce((r,s)=>r+s.lineTotal,0)),o=t.customer||{},d=t.documentType||"documento",a=j({notes:t.notes||"",customer:o}),c=String(o.name||"").trim()||(a&&a!=="Consumidor Final"?a:""),p=d==="consumidor_final"?"Consumidor Final":c||a||o.name||"—",m=S();return{id:t.id,businessName:m.alias||"App",businessDescription:m.description||"",documentTitle:N(d),documentType:d,documentTypeLabel:A(d),date:G(t.date||t.paidAt),customerName:p,customerPhone:o.phone||"",customerAddress:o.address||"",customerEmail:o.email||"",customerCedula:o.cedula||"",_customerRaw:{name:c,phone:o.phone||"",address:o.address||"",email:o.email||"",cedula:o.cedula||""},paymentMethod:J(t.paymentMethod),items:e,subtotal:n,iva:i,total:l,notes:String(t.notes||"").replace(/\[CAJA_POS\]/g,"").replace(/\[CONTADO\]/g,"").replace(/\[CREDITO\]/g,"").trim()}}function it(t){if(!t)return null;const n=(t.ERP_order_items||t.items||[]).map(a=>{var h,f;const c=Number(a.quantity||0),p=T(a.price),m=g(c*p),r=Number(((h=a.ERP_inventory_product)==null?void 0:h.taxRate)||a.taxRate||0);let s=m,u=0;return r>0&&(s=g(m/(1+r/100)),u=g(m-s)),{name:((f=a.ERP_inventory_product)==null?void 0:f.name)||a.name||"Producto",quantity:c,price:p,taxRate:r,subtotal:s,iva:u,lineTotal:m}}),i=n.reduce((a,c)=>a+c.subtotal,0),l=n.reduce((a,c)=>a+c.iva,0),o=n.reduce((a,c)=>a+c.lineTotal,0),d=t.ERP_customer||t.customer||{};return O({id:t.id,date:t.date,paidAt:t.paidAt,paymentMethod:t.paymentMethod||"credito",documentType:t.documentType||"nota_venta",notes:t.notes,customer:d,items:n,subtotal:i,iva:l,total:o})}function at({orderId:t,cart:e,customer:n,documentType:i,paymentMethod:l,saleType:o,notes:d}){const a=e.map(s=>{const u=Number(s.quantity||0),h=T(s.price),f=g(u*h),y=Number(s.taxRate||0);let w=f,x=0;return y>0&&(w=g(f/(1+y/100)),x=g(f-w)),{name:s.name,quantity:u,price:h,taxRate:y,subtotal:w,iva:x,lineTotal:f}}),c=a.reduce((s,u)=>s+u.subtotal,0),p=a.reduce((s,u)=>s+u.iva,0),m=a.reduce((s,u)=>s+u.lineTotal,0),r=i;return O({id:t,date:new Date().toISOString(),paidAt:o==="credito"?null:new Date().toISOString(),paymentMethod:o==="credito"?"credito":l,documentType:r,notes:d,customer:n,items:a,subtotal:c,iva:p,total:m})}function rt(t,e,n={}){B(V(t,e,n),{format:e})}function V(t,e,n={}){const{showNotes:i=!0}=n,l=I(e),o=l.isTicket,d=l.print,a=l.productColPct,c=o?"100%":"210mm",p=o?d.fs:"14px",m=o?"0":"24px",r=o?"padding:2px 1px;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;vertical-align:top;line-height:1.35;font-weight:600":"padding:2px 0;font-weight:600",s=o?`text-align:center;padding:2px 1px;vertical-align:top;font-size:${d.num}px;font-weight:700`:"text-align:center;padding:2px 4px;font-weight:700",u=o?`text-align:right;padding:2px 1px;vertical-align:top;font-size:${d.num}px;font-weight:700;word-wrap:break-word;overflow-wrap:break-word`:"text-align:right;padding:2px 0;font-weight:700",h=(x,C,R=!1)=>{const k=R?"font-weight:800;":"font-weight:700;",E=R?o?`font-size:${d.totalBold}px;`:"font-size:17px;":"";return`<div style="display:table;width:100%;${k}${E}">
      <span style="display:table-cell;padding:0 1px">${x}</span>
      <span style="display:table-cell;text-align:right;white-space:nowrap;padding:0 1px">${C}</span>
    </div>`},f=o?`<div style="margin-top:10px">
        <div style="border-top:1.5px solid #000;margin-top:28px;padding-top:5px;text-align:center;font-weight:800;font-size:${d.signature}px">Entrega</div>
        <div style="border-top:1.5px solid #000;margin-top:28px;padding-top:5px;text-align:center;font-weight:800;font-size:${d.signature}px">Recibe</div>
      </div>`:`<div style="display:flex;justify-content:space-between;gap:32px;margin-top:36px">
        <div style="flex:1;text-align:center">
          <div style="border-top:1.5px solid #000;margin-top:40px;padding-top:6px;font-weight:800;font-size:14px">Entrega</div>
        </div>
        <div style="flex:1;text-align:center">
          <div style="border-top:1.5px solid #000;margin-top:40px;padding-top:6px;font-weight:800;font-size:14px">Recibe</div>
        </div>
      </div>`,y=(t.items||[]).map(x=>`<tr>
          <td style="${r}">${b(x.name)}</td>
          <td style="${s}">${x.quantity}</td>
          <td style="${u}">${U(x.price)}</td>
          <td style="${u}">${$(x.lineTotal)}</td>
        </tr>`).join(""),w=(t.items||[]).reduce((x,C)=>x+Number(C.quantity||0),0);return`<div style="width:${c};max-width:${c};margin:0 auto;padding:${m};box-sizing:border-box;font-family:Arial,sans-serif;font-size:${p};font-weight:600;color:#000;line-height:1.35;overflow:hidden">
    <div style="text-align:center;margin-bottom:${o?6:16}px">
      <div style="font-weight:800;font-size:${o?d.title:22}px;color:#000">${b(t.businessName)}</div>
      ${t.businessDescription?`<div style="font-weight:800;font-size:${o?d.desc:13}px;color:#000;margin-top:2px">${b(t.businessDescription)}</div>`:""}
      <div style="font-weight:800;margin-top:${o?5:12}px;font-size:${o?d.docTitle:17}px;color:#000">${b(t.documentTitle)}</div>
      <div style="font-weight:800;font-size:${o?d.meta:13}px;color:#000;margin-top:2px">N° ${t.id||"—"}</div>
      <div style="font-weight:900;font-size:${o?d.date:18}px;color:#000;margin-top:3px">${b(t.date)}</div>
    </div>
    <div style="margin-bottom:${o?6:12}px;font-size:${o?d.customer:16}px;font-weight:700;color:#000;line-height:1.4">
      <div style="margin-bottom:${o?2:3}px"><strong>${v.name}</strong> ${b(t.customerName)}</div>
      ${t.customerCedula?`<div style="margin-bottom:${o?2:3}px"><strong>${v.cedula}</strong> ${b(t.customerCedula)}</div>`:""}
      ${t.customerPhone?`<div style="margin-bottom:${o?2:3}px"><strong>${v.phone}</strong> ${b(t.customerPhone)}</div>`:""}
      ${t.customerAddress?`<div style="margin-bottom:${o?2:3}px"><strong>${v.address}</strong> ${b(t.customerAddress)}</div>`:""}
      <div><strong>${v.payment}</strong> ${b(t.paymentMethod)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${o?6:12}px;color:#000;table-layout:fixed">
      <thead>
        <tr style="border-bottom:1px solid #ccc">
          <th style="text-align:left;padding:2px 1px;font-weight:800;color:#000;width:${o?a.product:"auto"}">Producto</th>
          <th style="text-align:center;padding:2px 1px;font-weight:800;color:#000;width:${o?a.cant:"auto"}">Cant</th>
          <th style="text-align:right;padding:2px 1px;font-weight:800;color:#000;width:${o?a.pu:"auto"}">P.U.</th>
          <th style="text-align:right;padding:2px 1px;font-weight:800;color:#000;width:${o?a.total:"auto"}">Total</th>
        </tr>
      </thead>
      <tbody>${y}</tbody>
      <tfoot>
        <tr style="border-top:1px solid #ccc">
          <td style="text-align:right;padding:3px 1px;font-weight:800;color:#000">Total Cant</td>
          <td style="text-align:center;padding:3px 1px;font-weight:800;color:#000">${w}</td>
          <td style="padding:3px 1px"></td>
          <td style="padding:3px 1px"></td>
        </tr>
      </tfoot>
    </table>
    <div style="border-top:1px dashed #999;padding-top:${o?3:10}px;color:#000">
      ${h("Subtotal",$(t.subtotal))}
      ${t.iva>0?h("IVA",$(t.iva)):""}
      ${h("TOTAL",$(t.total),!0)}
    </div>
    ${i&&t.notes?`<div style="margin-top:${o?4:10}px;font-size:${o?d.notes:12}px;font-weight:700;color:#000;word-wrap:break-word">${b(t.notes)}</div>`:""}
    <div style="text-align:center;margin-top:${o?6:16}px;margin-bottom:0;font-size:${o?d.footer:12}px;font-weight:800;color:#000">Gracias por su compra</div>
    ${f}
  </div>`}function b(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{et as D,v as R,X as a,it as b,at as c,A as d,J as e,tt as f,U as g,$ as h,Z as i,I as j,Q as k,M as l,ot as m,rt as n,G as o,B as p,O as q,nt as r};
