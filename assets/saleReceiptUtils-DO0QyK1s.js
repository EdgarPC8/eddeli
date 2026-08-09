import{x as B}from"./index-3mMnfPgn.js";import{f as V}from"./functions-CiZpeii4.js";const I=["ticket80","ticket55"];function W(t){return I.includes(t)}function K(t){return t==="ticket55"?55:t==="ticket80"?80:null}function G(t){return t==="ticket55"?2:t==="ticket80"?3:0}function yt(t){return t==="ticket55"?[55,200]:t==="ticket80"?[80,200]:null}function q(t){if(t==="a4")return{isTicket:!1,previewWidth:null,maxWidth:720,pad:3,baseFont:15,businessName:22,businessDesc:13,docTitle:17,meta:13,date:18,customer:16,total:17,footer:12,signature:14,tableProductWidth:"auto",productColPct:null,print:null};const e=t==="ticket55";return{isTicket:!0,narrow:e,previewWidth:e?200:280,maxWidth:e?200:280,pad:e?.75:1,baseFont:e?12:14,businessName:e?14:17,businessDesc:e?10:12,docTitle:e?13:15,meta:e?10:12,date:e?13:16,customer:e?12:14,total:e?13:15,footer:e?10:11,signature:e?11:13,tableProductWidth:e?"38%":"42%",productColPct:e?{product:"38%",cant:"14%",pu:"24%",total:"24%"}:{product:"40%",cant:"12%",pu:"24%",total:"24%"},print:e?{fs:"11px",title:14,desc:10,docTitle:13,meta:10,date:13,customer:12,num:10,totalBold:13,notes:10,footer:10,signature:11,padH:"1mm"}:{fs:"13px",title:17,desc:12,docTitle:15,meta:12,date:16,customer:14,num:12,totalBold:15,notes:11,footer:11,signature:13,padH:"2mm"}}}const E="[CAJA_POS]",J="[CONTADO]",U="[CREDITO]";function $t({baseNote:t,saleType:e}){const o=e==="credito"?U:J,a=String(t).replace(/\[CAJA_POS\]/g,"").replace(/\[CONTADO\]/g,"").replace(/\[CREDITO\]/g,"").replace(/\s+/g," ").trim();return`${E} ${o} ${a}`.trim()}function Y(t){if(!t)return"—";const e=String(t.notes||""),o=t.customer,a=String((o==null?void 0:o.name)||"").trim();if(!e.includes(E))return a||"—";const i=e.toLowerCase();return i.includes("mostrador")||i.includes("consumidor final")||i.includes("sin datos de cliente")?"Consumidor Final":a||"—"}function Z(t){const e=String((t==null?void 0:t.notes)||"");return!(!e.includes(E)||e.includes(U)||String((t==null?void 0:t.paymentMethod)||"").toLowerCase()==="credito")}function vt(t){return!Z(t)}function wt(t){return t.find(e=>{const o=String(e.name||"").toLowerCase();return o.includes("consumidor")||o.includes("final")})??null}function Q(t,{format:e="a4"}={}){if(!t)return;const o=W(e),a=K(e)??80,i=G(e),n=o?`
    @page { size: ${a}mm 200mm portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0 auto;
      padding: 0;
      width: ${a}mm;
      max-width: ${a}mm;
      min-width: ${a}mm;
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
      padding: 2mm ${i}mm 1.5mm ${i}mm;
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
        width: ${a}mm !important;
        max-width: ${a}mm !important;
        min-width: ${a}mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .receipt-print-root {
        width: 100% !important;
        max-width: 100% !important;
        padding: 2mm ${i}mm 1.5mm ${i}mm !important;
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
  `,r=o?`<div class="receipt-print-root">${t}</div>`:t,d=`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Imprimir</title>
  <style>${n}</style>
</head>
<body>${r}</body>
</html>`,u=document.createElement("iframe");u.setAttribute("aria-hidden","true"),u.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;",document.body.appendChild(u);const c=u.contentWindow,m=c==null?void 0:c.document;if(!c||!m){u.remove();return}m.open(),m.write(d),m.close();const l=()=>{try{if(o){const s=m.querySelector(".receipt-print-root")||m.body,x=Math.max(s.scrollHeight,s.offsetHeight,s.clientHeight),h=Math.max(a+20,Math.ceil(x*.264583)+4),b=m.createElement("style");b.textContent=`
          @page { size: ${a}mm ${h}mm portrait !important; margin: 0 !important; }
          html, body {
            width: ${a}mm !important;
            max-width: ${a}mm !important;
            min-width: ${a}mm !important;
          }
        `,m.head.appendChild(b)}c.focus(),c.print()}finally{window.setTimeout(()=>u.remove(),1500)}};window.setTimeout(l,350)}const X=t=>Number(Number(t||0).toFixed(2));function tt(t,e=9){const o=Math.max(0,Math.floor(Number(t)||0));return String(o).padStart(e,"0")}function et(t,e,o){const a=String(t).padStart(3,"0").slice(0,3),i=String(e).padStart(3,"0").slice(0,3);return`${a}-${i}-${tt(o)}`}function v(t,e=2){return X(t).toFixed(e)}function D(t){const e=Number(t||0);if(!Number.isFinite(e))return"0.00";const o=Number(e.toFixed(4));return Math.round(o*100)===o*100?o.toFixed(2):String(o)}function ot(t){return String(t||"").toLowerCase()==="produccion"?"PRODUCCIÓN":"PRUEBAS"}function nt(t){const e=String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");return e.includes("efectivo")||e==="01"?"SIN UTILIZACION DEL SISTEMA FINANCIERO":e.includes("tarjeta")||e==="16"?"TARJETA DE CREDITO":e.includes("transfer")||e.includes("deposito")||e==="20"?"TRANSFERENCIA / DEPOSITO BANCARIO":(e.includes("credito"),"OTROS CON UTILIZACION DEL SISTEMA FINANCIERO")}function at(t=[]){const e=(t||[]).map(n=>Number(n.taxRate||0)).filter(n=>n>0);if(!e.length)return 0;const o=new Map;e.forEach(n=>o.set(n,(o.get(n)||0)+1));let a=e[0],i=0;return o.forEach((n,r)=>{n>i&&(i=n,a=r)}),a}function Tt(t,e,o=null,a={}){if(!t)return null;const i=(o==null?void 0:o.establishmentCode)||(e==null?void 0:e.establishmentCode)||"001",n=(o==null?void 0:o.emissionPointCode)||(e==null?void 0:e.emissionPointCode)||"001",r=(o==null?void 0:o.sequential)!=null?Number(o.sequential):(e==null?void 0:e.nextInvoiceSequential)!=null?Number(e.nextInvoiceSequential):null,d=(o==null?void 0:o.accessKey)||(o==null?void 0:o.authorizationNumber)||"",u=(o==null?void 0:o.authorizationNumber)||(o==null?void 0:o.accessKey)||d,c=(o==null?void 0:o.authorizedAt)||null;return{...t,logoUrl:a.logoUrl||t.logoUrl||"",fiscal:{ruc:(e==null?void 0:e.ruc)||"",legalName:(e==null?void 0:e.legalName)||t.businessName||"",tradeName:(e==null?void 0:e.tradeName)||t.businessDescription||"",matrixAddress:(e==null?void 0:e.matrixAddress)||"",establishmentAddress:(e==null?void 0:e.establishmentAddress)||(e==null?void 0:e.matrixAddress)||"",phone:(e==null?void 0:e.phone)||"",email:(e==null?void 0:e.email)||"",accountingRequired:!!(e!=null&&e.accountingRequired),environment:(e==null?void 0:e.environment)||(o==null?void 0:o.environment)||"pruebas",environmentLabel:ot((o==null?void 0:o.environment)||(e==null?void 0:e.environment)),establishmentCode:String(i).padStart(3,"0").slice(0,3),emissionPointCode:String(n).padStart(3,"0").slice(0,3),sequential:r,invoiceNumber:r!=null?et(i,n,r):"",accessKey:d,authorizationNumber:u,authorizedAt:c,emissionDate:c&&String(c).slice(0,10)||t.dateIso&&String(t.dateIso).slice(0,10)||"",status:(o==null?void 0:o.status)||null,fromSettingsPreview:!(o!=null&&o.sequential)&&r!=null}}}function it(t){return String((t==null?void 0:t.documentType)||"")==="factura"}const dt=["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","212113","212311","232111","111213","131113","131311","111133","111331","113131","113113","133111","313111","211331","131131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"],F=104,rt=106;function lt(t){const e=[F];let o=F,a=1;for(let i=0;i<t.length;i+=1){const n=t.charCodeAt(i)-32;n<0||n>95||(e.push(n),o+=n*a,a+=1)}return e.push(o%103),e.push(rt),e}function st(t){const e=String(t||"").trim();if(!e)return null;const o=lt(e);let a=0;const i=[];return o.forEach(n=>{const r=dt[n];if(r)for(let d=0;d<r.length;d+=1){const u=Number(r[d]);d%2===0&&i.push({x:a,w:u}),a+=u}}),{width:a,rects:i}}function ut(t,{height:e=42,maxWidth:o=280}={}){const a=st(t);if(!a)return"";const i=o/a.width,n=e,r=a.rects.map(d=>`<rect x="${(d.x*i).toFixed(2)}" y="0" width="${(d.w*i).toFixed(2)}" height="${n}" fill="#000"/>`).join("");return`<svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${n}" viewBox="0 0 ${o} ${n}" preserveAspectRatio="none" aria-hidden="true">${r}</svg>`}function p(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function g(t,e,o=!1){return`<div style="margin:0 0 3px;line-height:1.3">
    <strong>${p(t)}</strong>
    <span style="font-weight:${o?800:600};word-break:break-all">${p(e||"—")}</span>
  </div>`}function k(t,{isTicket:e,ivaRate:o}){var c;const a=Number(t.discount||0),i=Number(t.ice||0),n=Number(t.tip||0),r=[["Total Sin Impuestos",v(t.subtotal)],["Descuento",v(a)],["Valor ICE",v(i)],[o>0?`Valor IVA ${o}%`:"Valor IVA",v(t.iva)]];e||r.push(["Propina",v(n)]),r.push(["Valor Total",v(t.total)]);const d=r.map(([m,l],s)=>`<div style="display:flex;justify-content:space-between;gap:8px;${s===r.length-1?"border-top:1px solid #000;margin-top:4px;padding-top:4px;font-weight:900":"font-weight:700"}">
        <span>${p(m)}</span><span>${p(l)}</span>
      </div>`).join(""),u=(c=t.fiscal)!=null&&c.fromSettingsPreview?'<div style="margin-top:6px;font-size:10px;font-weight:700;color:#444">Nº previsto (próximo secuencial de facturas). Tras autorización SRI se confirma.</div>':"";return`${d}${u}`}function M(t,e){const o=nt(t.paymentMethod);return`<div style="font-size:0.9em">
    <div style="font-weight:800;margin-bottom:4px">Información Adicional</div>
    ${e?"":'<div style="font-weight:600;margin-bottom:6px">Sucursal: Matriz</div>'}
    <table style="width:100%;border-collapse:collapse;font-size:0.85em">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:3px 4px;text-align:left">Forma de Pago</th>
          <th style="border:1px solid #000;padding:3px 4px;text-align:left">Valor</th>
          <th style="border:1px solid #000;padding:3px 4px;text-align:left">Plazo</th>
          <th style="border:1px solid #000;padding:3px 4px;text-align:left">Tiempo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border:1px solid #000;padding:3px 4px;font-weight:600">${p(o)}</td>
          <td style="border:1px solid #000;padding:3px 4px;font-weight:700">${p(v(t.total))}</td>
          <td style="border:1px solid #000;padding:3px 4px"></td>
          <td style="border:1px solid #000;padding:3px 4px;font-weight:600">ninguno</td>
        </tr>
      </tbody>
    </table>
  </div>`}function _(t,e,o){return`<div style="border:1px solid #000;padding:${o?6:8}px;margin-bottom:${o?8:10}px;line-height:1.35">
    ${g("Razón Social/ Nombres:",t.customerName)}
    ${o?`${g("Identificación:",t.customerCedula)}
           ${g("Dirección:",t.customerAddress)}
           ${g("Teléfono:",t.customerPhone)}
           ${g("Correo:",t.customerEmail)}`:`<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            ${g("Identificación:",t.customerCedula)}
            ${g("Fecha Emisión:",e)}
            ${g("Dirección:",t.customerAddress)}
            ${g("Guía de Remisión:","")}
            ${g("Teléfono:",t.customerPhone)}
            ${g("Correo:",t.customerEmail)}
          </div>`}
  </div>`}function L(t,e,o){const a=t.logoUrl?`<img src="${p(t.logoUrl)}" alt="" style="max-width:${o?120:160}px;max-height:${o?70:90}px;object-fit:contain;margin:0 ${o?"auto":0} 6px;display:block" />`:"";return`<div style="text-align:${o?"center":"left"}">
    ${a}
    <div style="font-weight:900;font-size:${o?"0.95em":"1.05em"};line-height:1.25">${p(e.legalName||t.businessName)}</div>
    ${e.tradeName||t.businessDescription?`<div style="font-weight:700;font-size:${o?"0.85em":"0.95em"};margin-top:2px">${p(e.tradeName||t.businessDescription)}</div>`:""}
    ${e.matrixAddress?`<div style="font-weight:600;font-size:0.82em;margin-top:4px"><strong>Matriz: </strong>${p(e.matrixAddress)}</div>`:""}
    ${e.establishmentAddress?`<div style="font-weight:600;font-size:0.82em"><strong>Sucursal: </strong>${p(e.establishmentAddress)}</div>`:""}
    <div style="font-weight:600;font-size:0.82em;margin-top:3px"><strong>Obligado a llevar Contabilidad: </strong>${e.accountingRequired?"SI":"NO"}</div>
    ${e.phone?`<div style="font-weight:600;font-size:0.82em">${p(e.phone)}</div>`:""}
    ${e.email?`<div style="font-weight:600;font-size:0.82em">${p(e.email)}</div>`:""}
  </div>`}function mt(t,e="a4"){var T;if(!t)return"";const o=q(e),a=o.isTicket,i=t.fiscal||{},n=t.items||[],r=at(n),d=i.emissionDate||t.date&&((T=String(t.date).match(/\d{4}-\d{2}-\d{2}/))==null?void 0:T[0])||"",u=i.authorizationNumber||i.accessKey||"",c=u?ut(u,{height:a?36:48,maxWidth:a?240:300}):"",m=a?"100%":"210mm",l=a?o.narrow?"11px":"12.5px":"13px",s=a?"0":"8px",x=a?`<div style="text-align:center">
        <div style="font-weight:900;font-size:1.15em;letter-spacing:0.5px;margin-bottom:6px">FACTURA</div>
        ${g("Ruc:",i.ruc,!0)}
      </div>`:`<div>
        <div style="font-weight:900;font-size:1.35em;letter-spacing:0.5px;margin-bottom:8px;text-align:center">FACTURA</div>
        ${g("RUC:",i.ruc,!0)}
        ${g("No.",i.invoiceNumber,!0)}
        ${g("Ambiente",i.environmentLabel,!0)}
        ${g("Autorización",i.authorizationNumber||"Pendiente de autorización SRI")}
        ${i.authorizedAt?g("Fecha y Hora Autorización",i.authorizedAt):""}
        ${c?`<div style="margin-top:8px">${c}</div>`:""}
      </div>`,h=`<div style="text-align:center;margin-top:6px">
    ${g("Fecha Emisión:",d,!0)}
    ${g("No.",i.invoiceNumber,!0)}
    ${g("Ambiente",i.environmentLabel,!0)}
    ${g("Autorización",i.authorizationNumber||"Pendiente SRI")}
    ${i.authorizedAt?g("Fecha y Hora Autorización",i.authorizedAt):""}
    ${i.accessKey?g("Clave acceso",i.accessKey):""}
  </div>`,b=a?`<div style="margin-bottom:8px">
        <div style="display:grid;grid-template-columns:0.7fr 2.2fr 0.9fr 0.7fr 0.9fr;gap:2px;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:3px;font-weight:800;font-size:0.85em">
          <span>Cant</span><span>Descripción</span><span style="text-align:right">P.V.P</span><span style="text-align:right">Descto</span><span style="text-align:right">Subtotal</span>
        </div>
        ${n.map(f=>`<div style="display:grid;grid-template-columns:0.7fr 2.2fr 0.9fr 0.7fr 0.9fr;gap:2px;padding:3px 0;border-bottom:1px dotted #999;font-weight:600;font-size:0.9em;align-items:start">
              <span>${p(v(f.quantity))}</span>
              <span style="word-break:break-word">${p(f.name)}</span>
              <span style="text-align:right">${p(D(f.price))}</span>
              <span style="text-align:right">${p(v(f.discount||0))}</span>
              <span style="text-align:right">${p(v(f.subtotal??f.lineTotal))}</span>
            </div>`).join("")}
      </div>`:`<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:0.92em">
        <thead>
          <tr>
            ${["Codigo","Descripción","Cant","Precio Unitario","Descto","Subtotal"].map((f,y)=>`<th style="border:1px solid #000;padding:4px 5px;font-weight:800;text-align:${y>=2?"right":"left"};background:#f3f3f3">${f}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${n.map((f,y)=>`<tr>
                <td style="border:1px solid #000;padding:3px 5px;font-weight:600">${p(f.code||f.productId||y+1)}</td>
                <td style="border:1px solid #000;padding:3px 5px;font-weight:600">${p(f.name)}</td>
                <td style="border:1px solid #000;padding:3px 5px;text-align:right;font-weight:700">${p(v(f.quantity))}</td>
                <td style="border:1px solid #000;padding:3px 5px;text-align:right;font-weight:700">${p(D(f.price))}</td>
                <td style="border:1px solid #000;padding:3px 5px;text-align:right;font-weight:700">${p(v(f.discount||0))}</td>
                <td style="border:1px solid #000;padding:3px 5px;text-align:right;font-weight:700">${p(v(f.subtotal??f.lineTotal))}</td>
              </tr>`).join("")}
        </tbody>
      </table>`;return a?`<div style="width:${m};max-width:${m};margin:0 auto;padding:${s};box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:${l};color:#000;line-height:1.3">
      ${x}
      <div style="margin:8px 0">${L(t,i,!0)}</div>
      ${h}
      <div style="border-top:1px solid #000;border-bottom:1px solid #000;padding:4px 0;margin:8px 0"></div>
      ${_(t,d,!0)}
      ${b}
      ${k(t,{isTicket:!0,ivaRate:r})}
      <div style="margin-top:10px">${M(t,!0)}</div>
    </div>`:`<div style="width:${m};max-width:${m};margin:0 auto;padding:${s};box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:${l};color:#000;line-height:1.3">
    <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:10px;margin-bottom:10px">
      <div style="border:1px solid #000;padding:10px">${L(t,i,!1)}</div>
      <div style="border:1px solid #000;padding:10px">${x}</div>
    </div>
    ${_(t,d,!1)}
    ${b}
    <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:10px;align-items:start">
      <div style="border:1px solid #000;padding:8px">${M(t,!1)}</div>
      <div style="border:1px solid #000;padding:8px">${k(t,{isTicket:!1,ivaRate:r})}</div>
    </div>
  </div>`}const $=t=>Number(Number(t||0).toFixed(2)),C=t=>Number(Number(t||0).toFixed(3)),ct={factura:"Factura",nota_venta:"Nota de venta",documento:"Comprobante",consumidor_final:"Consumidor final"},Nt=[{value:"factura",label:"Factura"},{value:"nota_venta",label:"Nota de venta"},{value:"documento",label:"Comprobante"},{value:"consumidor_final",label:"Consumidor final"}];function z(t){return ct[t]||t||"—"}function P(t){switch(t){case"factura":return"FACTURA";case"nota_venta":return"NOTA DE VENTA";case"consumidor_final":return"CONSUMIDOR FINAL";default:return"COMPROBANTE DE VENTA"}}function At(t,e){if(!t)return null;const o=e||t.documentType||"documento",a=t._customerRaw||{};if(o==="consumidor_final")return{...t,documentType:o,documentTypeLabel:z(o),documentTitle:P(o),customerName:"Consumidor Final",customerPhone:"",customerAddress:"",customerEmail:"",customerCedula:""};const i=String(a.name||"").trim()||(t.customerName&&t.customerName!=="Consumidor Final"?t.customerName:"")||"—";return{...t,documentType:o,documentTypeLabel:z(o),documentTitle:P(o),customerName:i,customerPhone:a.phone||t.customerPhone||"",customerAddress:a.address||t.customerAddress||"",customerEmail:a.email||t.customerEmail||"",customerCedula:a.cedula||t.customerCedula||""}}function Ct(t,e){return t==="factura"?"factura":t==="nota_venta"?"nota_venta":e?"documento":"consumidor_final"}function A(t){return`$${$(t).toFixed(2)}`}function pt(t){const e=C(t),o=Math.round(e*100)===e*100?2:3;return`$${e.toFixed(o)}`}function ft(t){return V(t)}const N={name:"Nom:",cedula:"CI:",phone:"Tel:",address:"Dir:",payment:"Pag:"};function gt(t){const e=String(t||"").toLowerCase();return e==="efectivo"?"Efectivo":e==="transferencia"?"Transferencia":e==="tarjeta"?"Tarjeta":e==="credito"?"Crédito":t||"—"}function j(t){if(!t)return null;const e=(t.items||[]).map(l=>({name:l.name||l.productName||"Producto",code:l.code||l.sku||l.barcode||"",productId:l.productId||l.id||null,quantity:Number(l.quantity||0),price:C(l.price),discount:$(l.discount||0),lineTotal:$(l.lineTotal??Number(l.quantity)*Number(l.price)),taxRate:Number(l.taxRate||0),subtotal:$(l.subtotal??l.lineTotal),iva:$(l.iva||0)})),o=$(t.subtotal??e.reduce((l,s)=>l+s.subtotal,0)),a=$(t.iva??e.reduce((l,s)=>l+s.iva,0)),i=$(t.total??e.reduce((l,s)=>l+s.lineTotal,0)),n=t.customer||{},r=t.documentType||"documento",d=Y({notes:t.notes||"",customer:n}),u=String(n.name||"").trim()||(d&&d!=="Consumidor Final"?d:""),c=r==="consumidor_final"?"Consumidor Final":u||d||n.name||"—",m=B();return{id:t.id,businessName:m.alias||"App",businessDescription:m.description||"",logoUrl:m.logoUrl||"",documentTitle:P(r),documentType:r,documentTypeLabel:z(r),date:ft(t.date||t.paidAt),dateIso:t.date||t.paidAt||null,customerName:c,customerPhone:n.phone||"",customerAddress:n.address||"",customerEmail:n.email||"",customerCedula:n.cedula||"",_customerRaw:{name:u,phone:n.phone||"",address:n.address||"",email:n.email||"",cedula:n.cedula||""},paymentMethod:gt(t.paymentMethod),items:e,subtotal:o,iva:a,total:i,notes:String(t.notes||"").replace(/\[CAJA_POS\]/g,"").replace(/\[CONTADO\]/g,"").replace(/\[CREDITO\]/g,"").trim()}}function Rt(t){if(!t)return null;const o=(t.ERP_order_items||t.items||[]).map(d=>{var b;const u=Number(d.quantity||0),c=C(d.price),m=$(u*c),l=Number(((b=d.ERP_inventory_product)==null?void 0:b.taxRate)||d.taxRate||0);let s=m,x=0;l>0&&(s=$(m/(1+l/100)),x=$(m-s));const h=d.ERP_inventory_product||{};return{name:h.name||d.name||"Producto",code:h.sku||h.barcode||d.code||"",productId:d.productId||h.id||null,quantity:u,price:c,discount:0,taxRate:l,subtotal:s,iva:x,lineTotal:m}}),a=o.reduce((d,u)=>d+u.subtotal,0),i=o.reduce((d,u)=>d+u.iva,0),n=o.reduce((d,u)=>d+u.lineTotal,0),r=t.ERP_customer||t.customer||{};return j({id:t.id,date:t.date,paidAt:t.paidAt,paymentMethod:t.paymentMethod||"credito",documentType:t.documentType||"nota_venta",notes:t.notes,customer:r,items:o,subtotal:a,iva:i,total:n})}function zt({orderId:t,cart:e,customer:o,documentType:a,paymentMethod:i,saleType:n,notes:r}){const d=e.map(s=>{const x=Number(s.quantity||0),h=C(s.price),b=$(x*h),T=Number(s.taxRate||0);let f=b,y=0;return T>0&&(f=$(b/(1+T/100)),y=$(b-f)),{name:s.name,code:s.sku||s.barcode||s.code||"",productId:s.productId||s.id||null,quantity:x,price:h,discount:0,taxRate:T,subtotal:f,iva:y,lineTotal:b}}),u=d.reduce((s,x)=>s+x.subtotal,0),c=d.reduce((s,x)=>s+x.iva,0),m=d.reduce((s,x)=>s+x.lineTotal,0),l=a;return j({id:t,date:new Date().toISOString(),paidAt:n==="credito"?null:new Date().toISOString(),paymentMethod:n==="credito"?"credito":i,documentType:l,notes:r,customer:o,items:d,subtotal:u,iva:c,total:m})}function Pt(t,e,o={}){const a=it(t)?mt(t,e):xt(t,e,o);Q(a,{format:e})}function xt(t,e,o={}){const{showNotes:a=!0}=o,i=q(e),n=i.isTicket,r=i.print,d=i.productColPct,u=n?"100%":"210mm",c=n?r.fs:"14px",m=n?"0":"24px",l=n?"padding:2px 1px;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;vertical-align:top;line-height:1.35;font-weight:600":"padding:2px 0;font-weight:600",s=n?`text-align:center;padding:2px 1px;vertical-align:top;font-size:${r.num}px;font-weight:700`:"text-align:center;padding:2px 4px;font-weight:700",x=n?`text-align:right;padding:2px 1px;vertical-align:top;font-size:${r.num}px;font-weight:700;word-wrap:break-word;overflow-wrap:break-word`:"text-align:right;padding:2px 0;font-weight:700",h=(y,R,O=!1)=>{const H=O?"font-weight:800;":"font-weight:700;",S=O?n?`font-size:${r.totalBold}px;`:"font-size:17px;":"";return`<div style="display:table;width:100%;${H}${S}">
      <span style="display:table-cell;padding:0 1px">${y}</span>
      <span style="display:table-cell;text-align:right;white-space:nowrap;padding:0 1px">${R}</span>
    </div>`},b=n?`<div style="margin-top:10px">
        <div style="border-top:1.5px solid #000;margin-top:28px;padding-top:5px;text-align:center;font-weight:800;font-size:${r.signature}px">Entrega</div>
        <div style="border-top:1.5px solid #000;margin-top:28px;padding-top:5px;text-align:center;font-weight:800;font-size:${r.signature}px">Recibe</div>
      </div>`:`<div style="display:flex;justify-content:space-between;gap:32px;margin-top:36px">
        <div style="flex:1;text-align:center">
          <div style="border-top:1.5px solid #000;margin-top:40px;padding-top:6px;font-weight:800;font-size:14px">Entrega</div>
        </div>
        <div style="flex:1;text-align:center">
          <div style="border-top:1.5px solid #000;margin-top:40px;padding-top:6px;font-weight:800;font-size:14px">Recibe</div>
        </div>
      </div>`,T=(t.items||[]).map(y=>`<tr>
          <td style="${l}">${w(y.name)}</td>
          <td style="${s}">${y.quantity}</td>
          <td style="${x}">${pt(y.price)}</td>
          <td style="${x}">${A(y.lineTotal)}</td>
        </tr>`).join(""),f=(t.items||[]).reduce((y,R)=>y+Number(R.quantity||0),0);return`<div style="width:${u};max-width:${u};margin:0 auto;padding:${m};box-sizing:border-box;font-family:Arial,sans-serif;font-size:${c};font-weight:600;color:#000;line-height:1.35;overflow:hidden">
    <div style="text-align:center;margin-bottom:${n?6:16}px">
      <div style="font-weight:800;font-size:${n?r.title:22}px;color:#000">${w(t.businessName)}</div>
      ${t.businessDescription?`<div style="font-weight:800;font-size:${n?r.desc:13}px;color:#000;margin-top:2px">${w(t.businessDescription)}</div>`:""}
      <div style="font-weight:800;margin-top:${n?5:12}px;font-size:${n?r.docTitle:17}px;color:#000">${w(t.documentTitle)}</div>
      <div style="font-weight:800;font-size:${n?r.meta:13}px;color:#000;margin-top:2px">N° ${t.id||"—"}</div>
      <div style="font-weight:900;font-size:${n?r.date:18}px;color:#000;margin-top:3px">${w(t.date)}</div>
    </div>
    <div style="margin-bottom:${n?6:12}px;font-size:${n?r.customer:16}px;font-weight:700;color:#000;line-height:1.4">
      <div style="margin-bottom:${n?2:3}px"><strong>${N.name}</strong> ${w(t.customerName)}</div>
      ${t.customerCedula?`<div style="margin-bottom:${n?2:3}px"><strong>${N.cedula}</strong> ${w(t.customerCedula)}</div>`:""}
      ${t.customerPhone?`<div style="margin-bottom:${n?2:3}px"><strong>${N.phone}</strong> ${w(t.customerPhone)}</div>`:""}
      ${t.customerAddress?`<div style="margin-bottom:${n?2:3}px"><strong>${N.address}</strong> ${w(t.customerAddress)}</div>`:""}
      <div><strong>${N.payment}</strong> ${w(t.paymentMethod)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${n?6:12}px;color:#000;table-layout:fixed">
      <thead>
        <tr style="border-bottom:1px solid #ccc">
          <th style="text-align:left;padding:2px 1px;font-weight:800;color:#000;width:${n?d.product:"auto"}">Producto</th>
          <th style="text-align:center;padding:2px 1px;font-weight:800;color:#000;width:${n?d.cant:"auto"}">Cant</th>
          <th style="text-align:right;padding:2px 1px;font-weight:800;color:#000;width:${n?d.pu:"auto"}">P.U.</th>
          <th style="text-align:right;padding:2px 1px;font-weight:800;color:#000;width:${n?d.total:"auto"}">Total</th>
        </tr>
      </thead>
      <tbody>${T}</tbody>
      <tfoot>
        <tr style="border-top:1px solid #ccc">
          <td style="text-align:right;padding:3px 1px;font-weight:800;color:#000">Total Cant</td>
          <td style="text-align:center;padding:3px 1px;font-weight:800;color:#000">${f}</td>
          <td style="padding:3px 1px"></td>
          <td style="padding:3px 1px"></td>
        </tr>
      </tfoot>
    </table>
    <div style="border-top:1px dashed #999;padding-top:${n?3:10}px;color:#000">
      ${h("Subtotal",A(t.subtotal))}
      ${t.iva>0?h("IVA",A(t.iva)):""}
      ${h("TOTAL",A(t.total),!0)}
    </div>
    ${a&&t.notes?`<div style="margin-top:${n?4:10}px;font-size:${n?r.notes:12}px;font-weight:700;color:#000;word-wrap:break-word">${w(t.notes)}</div>`:""}
    <div style="text-align:center;margin-top:${n?6:16}px;margin-bottom:0;font-size:${n?r.footer:12}px;font-weight:800;color:#000">Gracias por su compra</div>
    ${b}
  </div>`}function w(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{Nt as D,N as R,$t as a,Rt as b,zt as c,ut as d,at as e,wt as f,q as g,v as h,vt as i,D as j,it as k,pt as l,A as m,yt as n,W as o,Q as p,At as q,Ct as r,nt as s,Tt as t,Pt as u,z as v,gt as w,ft as x,j as y};
