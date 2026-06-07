/**
 * resolveTemplate.js
 *
 * Resuelve el documento y cada capa con los datos (doc.data):
 * - Capas tipo image: src desde bind.srcFrom o props.src o fallbackSrc.
 * - Capas tipo text: text desde bind.textFrom o se mantiene props.text.
 * (El fondo se hace con una capa tipo imagen que ocupe todo el canvas.)
 */
import { pathImg } from "../../../../api/axios";
import {
  resolveValue,
  resolveImageUrl,
  isNonEmptyString,
} from "./resolveMedia";

/**
 * Resuelve TODO el template antes de dibujar (solo layers; sin background fijo).
 */
export const resolveTemplate = (doc, docData) => {
  if (!doc) return doc;

  return {
    ...doc,
    layers: doc.layers.map((layer) =>
      resolveLayer(doc, docData, layer)
    ),
  };
};

export const resolveLayer = (doc, docData, layer) => {
  if (!layer) return layer;

  const keyForImage = layer?.fieldKey || layer?.bind?.srcFrom || "";
  const keyForText = layer?.fieldKey || layer?.bind?.textFrom || "";

  /* ================= IMAGE ================= */
  if (layer.type === "image") {
    const value = resolveValue(docData, keyForImage);

    const srcPrefix = layer?.bind?.srcPrefix || "";
    const fallbackSrc = layer?.bind?.fallbackSrc || "";
    const defaultSrc = layer?.props?.src || "";

    let finalSrc = "";

    if (isNonEmptyString(value)) {
      finalSrc = resolveImageUrl(value, { base: pathImg, prefix: srcPrefix });
    } else if (isNonEmptyString(defaultSrc)) {
      finalSrc = resolveImageUrl(defaultSrc, { base: pathImg, prefix: srcPrefix });
    } else if (isNonEmptyString(fallbackSrc)) {
      finalSrc = resolveImageUrl(fallbackSrc, { base: pathImg, prefix: srcPrefix });
    }

    return {
      ...layer,
      props: { ...(layer.props || {}), src: finalSrc },
    };
  }

/* ================= TEXT ================= */
if (layer.type === "text") {
  const value = resolveValue(docData, keyForText);

  // ❌ solo undefined y null significan "no hay dato"
  if (value === undefined || value === null) return layer;

  let text = String(value); // 🔥 números → string

  // const maxLen = Number(layer?.bind?.maxLen || 0);
  // if (maxLen > 0 && text.length > maxLen) {
  //   text = text.slice(0, maxLen);
  // }
  // si descomento esto se cortara cuando el bind.maxlengt se mayor a su valor despues ya pongo esto en la manipulacion del texto

  return {
    ...layer,
    props: { ...(layer.props || {}), text },
  };
}


  return layer;
};
