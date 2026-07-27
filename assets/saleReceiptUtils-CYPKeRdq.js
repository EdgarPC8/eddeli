import{t as D}from"./index-BTIOrwro.js";import{f as P}from"./functions-CEud01Zz.js";import{p as F,g as z}from"./printHtmlDocument-D6lHlTvR.js";const R="[CAJA_POS]",L="[CONTADO]",I="[CREDITO]";function V({baseNote:t,saleType:o}){const n=o==="credito"?I:L,d=String(t).replace(/\[CAJA_POS\]/g,"").replace(/\[CONTADO\]/g,"").replace(/\[CREDITO\]/g,"").replace(/\s+/g," ").trim();return`${R} ${n} ${d}`.trim()}function M(t){if(!t)return"—";const o=String(t.notes||""),n=t.customer,d=String((n==null?void 0:n.name)||"").trim();if(!o.includes(R))return d||"—";const l=o.toLowerCase();return l.includes("mostrador")||l.includes("consumidor final")||l.includes("sin datos de cliente")?"Consumidor Final":d||"—"}function Y(t){return String((t==null?void 0:t.notes)||"").includes(R)}function Q(t){return t.find(o=>{const n=String(o.name||"").toLowerCase();return n.includes("consumidor")||n.includes("final")})??null}const m=t=>Number(Number(t||0).toFixed(2)),w=t=>Number(Number(t||0).toFixed(3)),q={factura:"Factura",nota_venta:"Nota de venta",documento:"Comprobante",consumidor_final:"Consumidor final"},K=[{value:"factura",label:"Factura"},{value:"nota_venta",label:"Nota de venta"},{value:"documento",label:"Comprobante"},{value:"consumidor_final",label:"Consumidor final"}];function N(t){return q[t]||t||"—"}function A(t){switch(t){case"factura":return"FACTURA";case"nota_venta":return"NOTA DE VENTA";case"consumidor_final":return"CONSUMIDOR FINAL";default:return"COMPROBANTE DE VENTA"}}function W(t,o){if(!t)return null;const n=o||t.documentType||"documento",d=t._customerRaw||{};if(n==="consumidor_final")return{...t,documentType:n,documentTypeLabel:N(n),documentTitle:A(n),customerName:"Consumidor Final",customerPhone:"",customerAddress:"",customerEmail:"",customerCedula:""};const l=String(d.name||"").trim()||(t.customerName&&t.customerName!=="Consumidor Final"?t.customerName:"")||"—";return{...t,documentType:n,documentTypeLabel:N(n),documentTitle:A(n),customerName:l,customerPhone:d.phone||t.customerPhone||"",customerAddress:d.address||t.customerAddress||"",customerEmail:d.email||t.customerEmail||"",customerCedula:d.cedula||t.customerCedula||""}}function X(t,o){return t==="factura"?"factura":t==="nota_venta"?"nota_venta":o?"documento":"consumidor_final"}function T(t){return`$${m(t).toFixed(2)}`}function k(t){const o=w(t),n=Math.round(o*100)===o*100?2:3;return`$${o.toFixed(n)}`}function j(t){return P(t)}const $={name:"Nom:",cedula:"CI:",phone:"Tel:",address:"Dir:",payment:"Pag:"};function U(t){const o=String(t||"").toLowerCase();return o==="efectivo"?"Efectivo":o==="transferencia"?"Transferencia":o==="tarjeta"?"Tarjeta":o==="credito"?"Crédito":t||"—"}function O(t){if(!t)return null;const o=(t.items||[]).map(a=>({name:a.name||a.productName||"Producto",quantity:Number(a.quantity||0),price:w(a.price),lineTotal:m(a.lineTotal??Number(a.quantity)*Number(a.price)),taxRate:Number(a.taxRate||0),subtotal:m(a.subtotal??a.lineTotal),iva:m(a.iva||0)})),n=m(t.subtotal??o.reduce((a,r)=>a+r.subtotal,0)),d=m(t.iva??o.reduce((a,r)=>a+r.iva,0)),l=m(t.total??o.reduce((a,r)=>a+r.lineTotal,0)),e=t.customer||{},s=t.documentType||"documento",i=M({notes:t.notes||"",customer:e}),c=String(e.name||"").trim()||(i&&i!=="Consumidor Final"?i:""),v=s==="consumidor_final"?"Consumidor Final":c||i||e.name||"—",p=D();return{id:t.id,businessName:p.alias||"App",businessDescription:p.description||"",documentTitle:A(s),documentType:s,documentTypeLabel:N(s),date:j(t.date||t.paidAt),customerName:v,customerPhone:e.phone||"",customerAddress:e.address||"",customerEmail:e.email||"",customerCedula:e.cedula||"",_customerRaw:{name:c,phone:e.phone||"",address:e.address||"",email:e.email||"",cedula:e.cedula||""},paymentMethod:U(t.paymentMethod),items:o,subtotal:n,iva:d,total:l,notes:String(t.notes||"").replace(/\[CAJA_POS\]/g,"").replace(/\[CONTADO\]/g,"").replace(/\[CREDITO\]/g,"").trim()}}function Z(t){if(!t)return null;const n=(t.ERP_order_items||t.items||[]).map(i=>{var x,y;const c=Number(i.quantity||0),v=w(i.price),p=m(c*v),a=Number(((x=i.ERP_inventory_product)==null?void 0:x.taxRate)||i.taxRate||0);let r=p,u=0;return a>0&&(r=m(p/(1+a/100)),u=m(p-r)),{name:((y=i.ERP_inventory_product)==null?void 0:y.name)||i.name||"Producto",quantity:c,price:v,taxRate:a,subtotal:r,iva:u,lineTotal:p}}),d=n.reduce((i,c)=>i+c.subtotal,0),l=n.reduce((i,c)=>i+c.iva,0),e=n.reduce((i,c)=>i+c.lineTotal,0),s=t.ERP_customer||t.customer||{};return O({id:t.id,date:t.date,paidAt:t.paidAt,paymentMethod:t.paymentMethod||"credito",documentType:t.documentType||"nota_venta",notes:t.notes,customer:s,items:n,subtotal:d,iva:l,total:e})}function tt({orderId:t,cart:o,customer:n,documentType:d,paymentMethod:l,saleType:e,notes:s}){const i=o.map(r=>{const u=Number(r.quantity||0),x=w(r.price),y=m(u*x),h=Number(r.taxRate||0);let b=y,g=0;return h>0&&(b=m(y/(1+h/100)),g=m(y-b)),{name:r.name,quantity:u,price:x,taxRate:h,subtotal:b,iva:g,lineTotal:y}}),c=i.reduce((r,u)=>r+u.subtotal,0),v=i.reduce((r,u)=>r+u.iva,0),p=i.reduce((r,u)=>r+u.lineTotal,0),a=d;return O({id:t,date:new Date().toISOString(),paidAt:e==="credito"?null:new Date().toISOString(),paymentMethod:e==="credito"?"credito":l,documentType:a,notes:s,customer:n,items:i,subtotal:c,iva:v,total:p})}function et(t,o,n={}){F(B(t,o,n),{format:o})}function B(t,o,n={}){const{showNotes:d=!0}=n,l=z(o),e=l.isTicket,s=l.print,i=l.productColPct,c=e?"100%":"210mm",v=e?s.fs:"14px",p=e?"0":"24px",a=e?"padding:2px 1px;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;vertical-align:top;line-height:1.35;font-weight:600":"padding:2px 0;font-weight:600",r=e?`text-align:center;padding:2px 1px;vertical-align:top;font-size:${s.num}px;font-weight:700`:"text-align:center;padding:2px 4px;font-weight:700",u=e?`text-align:right;padding:2px 1px;vertical-align:top;font-size:${s.num}px;font-weight:700;word-wrap:break-word;overflow-wrap:break-word`:"text-align:right;padding:2px 0;font-weight:700",x=(g,C,_=!1)=>{const E=_?"font-weight:800;":"font-weight:700;",S=_?e?`font-size:${s.totalBold}px;`:"font-size:17px;":"";return`<div style="display:table;width:100%;${E}${S}">
      <span style="display:table-cell;padding:0 1px">${g}</span>
      <span style="display:table-cell;text-align:right;white-space:nowrap;padding:0 1px">${C}</span>
    </div>`},y=e?`<div style="margin-top:10px">
        <div style="border-top:1.5px solid #000;margin-top:28px;padding-top:5px;text-align:center;font-weight:800;font-size:${s.signature}px">Entrega</div>
        <div style="border-top:1.5px solid #000;margin-top:28px;padding-top:5px;text-align:center;font-weight:800;font-size:${s.signature}px">Recibe</div>
      </div>`:`<div style="display:flex;justify-content:space-between;gap:32px;margin-top:36px">
        <div style="flex:1;text-align:center">
          <div style="border-top:1.5px solid #000;margin-top:40px;padding-top:6px;font-weight:800;font-size:14px">Entrega</div>
        </div>
        <div style="flex:1;text-align:center">
          <div style="border-top:1.5px solid #000;margin-top:40px;padding-top:6px;font-weight:800;font-size:14px">Recibe</div>
        </div>
      </div>`,h=(t.items||[]).map(g=>`<tr>
          <td style="${a}">${f(g.name)}</td>
          <td style="${r}">${g.quantity}</td>
          <td style="${u}">${k(g.price)}</td>
          <td style="${u}">${T(g.lineTotal)}</td>
        </tr>`).join(""),b=(t.items||[]).reduce((g,C)=>g+Number(C.quantity||0),0);return`<div style="width:${c};max-width:${c};margin:0 auto;padding:${p};box-sizing:border-box;font-family:Arial,sans-serif;font-size:${v};font-weight:600;color:#000;line-height:1.35;overflow:hidden">
    <div style="text-align:center;margin-bottom:${e?6:16}px">
      <div style="font-weight:800;font-size:${e?s.title:22}px;color:#000">${f(t.businessName)}</div>
      ${t.businessDescription?`<div style="font-weight:800;font-size:${e?s.desc:13}px;color:#000;margin-top:2px">${f(t.businessDescription)}</div>`:""}
      <div style="font-weight:800;margin-top:${e?5:12}px;font-size:${e?s.docTitle:17}px;color:#000">${f(t.documentTitle)}</div>
      <div style="font-weight:800;font-size:${e?s.meta:13}px;color:#000;margin-top:2px">N° ${t.id||"—"}</div>
      <div style="font-weight:900;font-size:${e?s.date:18}px;color:#000;margin-top:3px">${f(t.date)}</div>
    </div>
    <div style="margin-bottom:${e?6:12}px;font-size:${e?s.customer:16}px;font-weight:700;color:#000;line-height:1.4">
      <div style="margin-bottom:${e?2:3}px"><strong>${$.name}</strong> ${f(t.customerName)}</div>
      ${t.customerCedula?`<div style="margin-bottom:${e?2:3}px"><strong>${$.cedula}</strong> ${f(t.customerCedula)}</div>`:""}
      ${t.customerPhone?`<div style="margin-bottom:${e?2:3}px"><strong>${$.phone}</strong> ${f(t.customerPhone)}</div>`:""}
      ${t.customerAddress?`<div style="margin-bottom:${e?2:3}px"><strong>${$.address}</strong> ${f(t.customerAddress)}</div>`:""}
      <div><strong>${$.payment}</strong> ${f(t.paymentMethod)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${e?6:12}px;color:#000;table-layout:fixed">
      <thead>
        <tr style="border-bottom:1px solid #ccc">
          <th style="text-align:left;padding:2px 1px;font-weight:800;color:#000;width:${e?i.product:"auto"}">Producto</th>
          <th style="text-align:center;padding:2px 1px;font-weight:800;color:#000;width:${e?i.cant:"auto"}">Cant</th>
          <th style="text-align:right;padding:2px 1px;font-weight:800;color:#000;width:${e?i.pu:"auto"}">P.U.</th>
          <th style="text-align:right;padding:2px 1px;font-weight:800;color:#000;width:${e?i.total:"auto"}">Total</th>
        </tr>
      </thead>
      <tbody>${h}</tbody>
      <tfoot>
        <tr style="border-top:1px solid #ccc">
          <td style="text-align:right;padding:3px 1px;font-weight:800;color:#000">Total Cant</td>
          <td style="text-align:center;padding:3px 1px;font-weight:800;color:#000">${b}</td>
          <td style="padding:3px 1px"></td>
          <td style="padding:3px 1px"></td>
        </tr>
      </tfoot>
    </table>
    <div style="border-top:1px dashed #999;padding-top:${e?3:10}px;color:#000">
      ${x("Subtotal",T(t.subtotal))}
      ${t.iva>0?x("IVA",T(t.iva)):""}
      ${x("TOTAL",T(t.total),!0)}
    </div>
    ${d&&t.notes?`<div style="margin-top:${e?4:10}px;font-size:${e?s.notes:12}px;font-weight:700;color:#000;word-wrap:break-word">${f(t.notes)}</div>`:""}
    <div style="text-align:center;margin-top:${e?6:16}px;margin-bottom:0;font-size:${e?s.footer:12}px;font-weight:800;color:#000">Gracias por su compra</div>
    ${y}
  </div>`}function f(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{K as D,$ as R,V as a,Z as b,tt as c,N as d,k as e,Q as f,T as g,W as h,Y as i,et as j,j as k,O as n,U as p,X as r};
